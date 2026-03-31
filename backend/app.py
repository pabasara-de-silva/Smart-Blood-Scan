from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Optional
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import bcrypt
import uuid
import os
import cv2
import json
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from db import users, patients, scans
from fastapi_mail import FastMail, MessageSchema
from email_config import conf
from token_utils import create_reset_token, verify_reset_token

# ── Keras preprocessing imports ───────────────────────────────
from tensorflow.keras.applications.efficientnet import preprocess_input as preprocess_effnet
from tensorflow.keras.applications.densenet     import preprocess_input as preprocess_densenet
from tensorflow.keras.applications.resnet       import preprocess_input as preprocess_resnet
from tensorflow.keras.applications.inception_v3 import preprocess_input as preprocess_inception
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as preprocess_mobilenet

app = FastAPI()

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve Grad-CAM images as static files ─────────────────────
os.makedirs("gradcam_outputs", exist_ok=True)
app.mount("/gradcam", StaticFiles(directory="gradcam_outputs"), name="gradcam")

# ══════════════════════════════════════════════════════════════
#  FOCAL LOSS — required for loading trained models
# ══════════════════════════════════════════════════════════════

def focal_loss(gamma=2.0, alpha=0.75):
    def loss_fn(y_true, y_pred):
        y_pred   = tf.clip_by_value(y_pred, 1e-7, 1.0 - 1e-7)
        bce      = -(y_true * tf.math.log(y_pred) + (1.0 - y_true) * tf.math.log(1.0 - y_pred))
        p_t      = y_true * y_pred + (1.0 - y_true) * (1.0 - y_pred)
        alpha_t  = y_true * alpha + (1.0 - y_true) * (1.0 - alpha)
        focal_wt = alpha_t * tf.pow(1.0 - p_t, gamma)
        return tf.reduce_mean(focal_wt * bce)
    loss_fn.__name__ = "focal_loss"
    return loss_fn

# ══════════════════════════════════════════════════════════════
#  MODEL CONFIGURATION
# ══════════════════════════════════════════════════════════════

MODEL_NAMES = ["EfficientNetB0", "DenseNet121", "ResNet50", "InceptionV3", "MobileNetV2"]

# Image sizes per model — InceptionV3 requires 299x299
MODEL_IMG_SIZES = {
    "EfficientNetB0": 224,
    "DenseNet121":    224,
    "ResNet50":       224,
    "InceptionV3":    299,
    "MobileNetV2":    224,
}

# Per-model ImageNet preprocessing functions
MODEL_PREPROCESS_FNS = {
    "EfficientNetB0": preprocess_effnet,
    "DenseNet121":    preprocess_densenet,
    "ResNet50":       preprocess_resnet,
    "InceptionV3":    preprocess_inception,
    "MobileNetV2":    preprocess_mobilenet,
}

# ── Load all 5 models at startup ──────────────────────────────
print("Loading models...")
models = {}
for name in MODEL_NAMES:
    path = os.path.join("model", f"{name}_final.keras")
    if os.path.exists(path):
        models[name] = tf.keras.models.load_model(
            path,
            custom_objects={
                "focal_loss": focal_loss,
                "loss_fn":    focal_loss(gamma=2.0, alpha=0.75),
            }
        )
        print(f"  [OK] {name} loaded")
    else:
        print(f"  [WARN] {name} not found at {path}")

# ── Load ensemble weights from ensemble_weights_v2.json ───────
ENSEMBLE_WEIGHTS   = {}
OPTIMAL_THRESHOLD  = 0.5275  # fallback default

weights_path = os.path.join("model", "ensemble_weights_v2.json")
if os.path.exists(weights_path):
    with open(weights_path) as f:
        ew = json.load(f)
    OPTIMAL_THRESHOLD = ew.get("optimal_threshold", 0.5275)
    for name, info in ew.get("models", {}).items():
        ENSEMBLE_WEIGHTS[name] = info["weight"]
    print(f"Ensemble weights loaded. Threshold={OPTIMAL_THRESHOLD:.4f}")
    for name, w in sorted(ENSEMBLE_WEIGHTS.items(), key=lambda x: -x[1]):
        print(f"  {name:<20} weight={w:.4f}")
else:
    # Fallback: equal weights if JSON not found
    n = len(MODEL_NAMES)
    ENSEMBLE_WEIGHTS = {name: 1.0 / n for name in MODEL_NAMES}
    print(f"[WARN] ensemble_weights_v2.json not found — using equal weights")

classes = ["HEM (Healthy)", "ALL (Leukemia)"]

# ══════════════════════════════════════════════════════════════
#  PREPROCESSING
# ══════════════════════════════════════════════════════════════

def stain_normalize(image_array: np.ndarray) -> np.ndarray:
    """
    Per-channel percentile stretching (2nd-98th percentile).
    Reduces staining variability across different lab slides.
    Same normalisation applied during training.
    """
    img = image_array.astype(np.float32)
    for ch in range(3):
        channel = img[:, :, ch]
        ch_min  = np.percentile(channel, 2)
        ch_max  = np.percentile(channel, 98)
        if ch_max > ch_min:
            img[:, :, ch] = 255.0 * (channel - ch_min) / (ch_max - ch_min)
    return np.clip(img, 0, 255).astype(np.uint8)


def preprocess_image(img: Image.Image, model_name: str) -> np.ndarray:
    """
    Full preprocessing pipeline for a single image:
    1. Resize to model-specific input size
    2. Stain normalisation
    3. Model-specific ImageNet preprocessing
    4. Add batch dimension
    """
    size        = MODEL_IMG_SIZES.get(model_name, 224)
    img_resized = img.resize((size, size))
    arr         = np.array(img_resized).astype(np.float32)
    arr         = stain_normalize(arr).astype(np.float32)
    preprocess_fn = MODEL_PREPROCESS_FNS[model_name]
    arr         = preprocess_fn(arr)
    return np.expand_dims(arr, axis=0)


def augment_image(img: Image.Image, model_name: str) -> np.ndarray:
    """
    Single augmented forward pass for TTA.
    Light augmentation: random flip, small rotation, slight zoom.
    """
    import random
    size = MODEL_IMG_SIZES.get(model_name, 224)
    arr  = np.array(img.resize((size, size)))

    # Random horizontal flip
    if random.random() > 0.5:
        arr = np.fliplr(arr)

    # Random vertical flip
    if random.random() > 0.5:
        arr = np.flipud(arr)

    # Random rotation (±20 degrees)
    angle  = random.uniform(-20, 20)
    h, w   = arr.shape[:2]
    M      = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    arr    = cv2.warpAffine(arr, M, (w, h), borderMode=cv2.BORDER_REFLECT)

    arr = stain_normalize(arr.astype(np.float32)).astype(np.float32)
    arr = MODEL_PREPROCESS_FNS[model_name](arr)
    return np.expand_dims(arr, axis=0)


def predict_with_tta(model, img: Image.Image, model_name: str, tta_steps: int = 8) -> float:
    """
    Test-Time Augmentation: runs TTA_STEPS forward passes and averages.
    Pass 1 is the standard (no augmentation) prediction.
    Passes 2-N use random augmentation.
    Label inversion (1 - prob) is applied per pass since
    Keras maps labels alphabetically: all->0, hem->1
    but true labels are ALL=1, HEM=0.
    """
    # Standard pass
    processed  = preprocess_image(img, model_name)
    raw_prob   = float(model.predict(processed, verbose=0)[0][0])
    total_prob = 1.0 - raw_prob  # label inversion

    # Augmented passes
    for _ in range(tta_steps - 1):
        aug        = augment_image(img, model_name)
        raw_prob   = float(model.predict(aug, verbose=0)[0][0])
        total_prob += (1.0 - raw_prob)

    return total_prob / tta_steps


# ══════════════════════════════════════════════════════════════
#  GRAD-CAM
# ══════════════════════════════════════════════════════════════

def generate_gradcam(model, img: Image.Image, model_name: str) -> str:
    """
    Generates a Grad-CAM heatmap overlay using the last Conv2D layer.
    Uses DenseNet121 by default (called with the DenseNet121 model).
    Saves the overlay to gradcam_outputs/ and returns the URL path.
    """
    # Find last Conv2D layer
    last_conv_name = None
    for layer in reversed(model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            last_conv_name = layer.name
            break
    if last_conv_name is None:
        raise ValueError("No Conv2D layer found in model")

    # Build gradient model
    grad_model = tf.keras.models.Model(
        inputs=model.inputs,
        outputs=[model.get_layer(last_conv_name).output, model.output],
    )

    # Preprocess without batch dim for gradient computation
    size      = MODEL_IMG_SIZES.get(model_name, 224)
    img_resized = img.resize((size, size))
    arr       = stain_normalize(np.array(img_resized).astype(np.float32))
    arr       = MODEL_PREPROCESS_FNS[model_name](arr.astype(np.float32))
    processed = np.expand_dims(arr, axis=0)

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(processed)
        # Use the ALL class (index 0 after inversion = label 1 in model output)
        # Model outputs prob of hem (index 1 alphabetically)
        # We want gradients w.r.t the predicted class
        predicted_class = int(np.argmax(predictions[0]))
        loss = predictions[:, predicted_class]

    grads        = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_out     = conv_outputs[0]
    heatmap      = tf.reduce_sum(tf.multiply(pooled_grads, conv_out), axis=-1)
    heatmap      = np.maximum(heatmap.numpy(), 0)
    heatmap     /= (heatmap.max() + 1e-8)

    # Overlay on original image
    orig_np         = np.array(img.resize((224, 224)))
    heatmap_resized = cv2.resize(heatmap, (224, 224))
    heatmap_color   = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
    heatmap_color   = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    superimposed    = cv2.addWeighted(orig_np, 0.55, heatmap_color, 0.45, 0)

    filename = f"{uuid.uuid4().hex}.jpg"
    Image.fromarray(superimposed).save(os.path.join("gradcam_outputs", filename))
    return f"/gradcam/{filename}"


# ══════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════

def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def calc_age(dob: str) -> int:
    try:
        birth = datetime.strptime(dob, "%Y-%m-%d")
        today = datetime.today()
        return today.year - birth.year - (
            (today.month, today.day) < (birth.month, birth.day)
        )
    except Exception:
        return 0


def find_patient(patient_id_str: str):
    """
    Flexible patient lookup — tries ObjectId first, falls back to patientIdStr.
    """
    try:
        oid = ObjectId(patient_id_str)
        doc = patients.find_one({"_id": oid})
        if doc:
            return doc
    except InvalidId:
        pass
    return patients.find_one({"patientIdStr": patient_id_str})


# ══════════════════════════════════════════════════════════════
#  AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════

class UserSignup(BaseModel):
    firstName:      str
    lastName:       str
    email:          str
    specialization: str
    institution:    str
    licenseNo:      Optional[str] = None
    password:       str


@app.post("/signup")
async def signup(user: UserSignup):
    if users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="User already exists")

    existing_license = None
    if user.licenseNo and user.licenseNo.strip():
        existing_license = users.find_one({"licenseNo": user.licenseNo.strip()})
    if existing_license:
        raise HTTPException(status_code=400, detail="License number already exists")

    hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())
    users.insert_one({
        "firstName":      user.firstName,
        "lastName":       user.lastName,
        "email":          user.email,
        "specialization": user.specialization,
        "institution":    user.institution,
        "licenseNo":      user.licenseNo,
        "password":       hashed,
    })
    return {"message": "Signup successful"}


@app.post("/signin")
async def signin(email: str = Form(...), password: str = Form(...)):
    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not bcrypt.checkpw(password.encode(), user["password"]):
        raise HTTPException(status_code=401, detail="Wrong password")
    return {
        "message": "Login successful",
        "user": {
            "id":             str(user["_id"]),
            "email":          user["email"],
            "firstName":      user.get("firstName"),
            "lastName":       user.get("lastName"),
            "specialization": user.get("specialization"),
            "institution":    user.get("institution"),
        },
    }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@app.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    frontend_url  = os.getenv("FRONTEND_URL")
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")

    if not frontend_url:
        raise HTTPException(status_code=500, detail="Missing FRONTEND_URL in backend environment")
    if (not mail_username or not mail_password
            or "your_email" in mail_username
            or "your_app_password" in mail_password):
        raise HTTPException(status_code=500, detail="Email service is not configured on the server")

    token      = create_reset_token(data.email)
    reset_link = f"{frontend_url}/reset-password/{token}"
    html       = f"""
    <h3>Password Reset</h3>
    <p>Click below to reset your Smart Blood Scan password:</p>
    <a href="{reset_link}">Reset Password</a>
    <p>This link expires in 30 minutes.</p>
    """
    message = MessageSchema(
        subject="Reset Your Password — Smart Blood Scan",
        recipients=[data.email],
        body=html,
        subtype="html",
    )
    try:
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to send reset email. Check SMTP settings.")

    return {"message": "Reset email sent"}


class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str


@app.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    email = verify_reset_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt())
    users.update_one({"email": email}, {"$set": {"password": hashed}})
    return {"message": "Password reset successful"}


# ══════════════════════════════════════════════════════════════
#  PREDICTION — WEIGHTED ENSEMBLE WITH TTA
# ══════════════════════════════════════════════════════════════

@app.post("/predict")
async def predict(
    image:     UploadFile = File(...),
    patientId: str        = Form(default=""),
    doctorId:  str        = Form(default=""),
):
    # ── Read image ────────────────────────────────────────────
    contents = await image.read()
    img      = Image.open(io.BytesIO(contents)).convert("RGB")

    if not models:
        raise HTTPException(status_code=500, detail="No models loaded. Check model/ directory.")

    # ── Run TTA inference for each model ─────────────────────
    # Each model produces a probability of ALL (Leukemia) after label inversion
    weighted_prob = 0.0
    total_weight  = 0.0
    model_probs   = {}

    for model_name, model in models.items():
        weight   = ENSEMBLE_WEIGHTS.get(model_name, 1.0 / len(models))
        prob_all = predict_with_tta(model, img, model_name, tta_steps=8)
        model_probs[model_name]  = round(prob_all, 4)
        weighted_prob           += weight * prob_all
        total_weight            += weight

    # Normalise in case weights don't sum to exactly 1
    ensemble_prob = weighted_prob / total_weight if total_weight > 0 else 0.5

    # ── Apply Youden threshold ────────────────────────────────
    label      = "ALL (Leukemia)" if ensemble_prob >= OPTIMAL_THRESHOLD else "HEM (Healthy)"
    confidence = ensemble_prob if ensemble_prob >= OPTIMAL_THRESHOLD else (1.0 - ensemble_prob)

    # ── Grad-CAM using DenseNet121 ────────────────────────────
    gradcam_url = None
    if "DenseNet121" in models:
        try:
            gradcam_url = generate_gradcam(models["DenseNet121"], img, "DenseNet121")
        except Exception as e:
            print(f"[Grad-CAM] skipped: {e}")

    # ── Persist scan if patient attached ──────────────────────
    scan_id = None
    if patientId and patientId not in ("", "quick"):
        patient_doc = find_patient(patientId)
        if not patient_doc:
            raise HTTPException(status_code=404, detail=f"Patient '{patientId}' not found")

        inserted = scans.insert_one({
            "patientId":    str(patient_doc["_id"]),
            "patientName":  patient_doc.get("name"),
            "patientIdStr": patient_doc.get("patientIdStr", ""),
            "doctorId":     doctorId,
            "filename":     image.filename,
            "model":        "Weighted Ensemble (5-model)",
            "label":        label,
            "confidence":   confidence,
            "gradcam_url":  gradcam_url,
            "model_probs":  model_probs,
            "date":         datetime.utcnow().isoformat(),
        })
        scan_id = str(inserted.inserted_id)

    response = {
        "label":       label,
        "confidence":  confidence,
        "saved":       scan_id is not None,
        "scanId":      scan_id,
        "model":       "Weighted Ensemble (5-model)",
        "model_probs": model_probs,
        "threshold":   OPTIMAL_THRESHOLD,
    }
    if gradcam_url:
        response["gradcam_url"] = gradcam_url

    return response


# ══════════════════════════════════════════════════════════════
#  PATIENT ENDPOINTS
# ══════════════════════════════════════════════════════════════

class PatientCreate(BaseModel):
    name:      str
    dob:       str
    gender:    str
    bloodType: Optional[str] = "Unknown"
    notes:     Optional[str] = ""
    doctorId:  str


class PatientUpdate(BaseModel):
    name:      Optional[str] = None
    dob:       Optional[str] = None
    gender:    Optional[str] = None
    bloodType: Optional[str] = None
    notes:     Optional[str] = None


@app.get("/patients")
async def get_patients(doctorId: str):
    docs   = list(patients.find({"doctorId": doctorId}).sort("createdAt", -1))
    result = []
    for doc in docs:
        pid           = str(doc["_id"])
        scan_count    = scans.count_documents({"patientId": pid})
        last_scan_doc = scans.find_one({"patientId": pid}, sort=[("date", -1)])
        last_scan     = last_scan_doc["date"][:10] if last_scan_doc else "—"
        p             = serialize(doc)
        p["scanCount"] = scan_count
        p["lastScan"]  = last_scan
        p["age"]       = calc_age(p.get("dob", ""))
        result.append(p)
    return result


@app.post("/patients")
async def create_patient(patient: PatientCreate):
    count          = patients.count_documents({"doctorId": patient.doctorId})
    patient_id_str = f"P-{str(count + 1).zfill(3)}"
    doc = {
        "patientIdStr": patient_id_str,
        "name":         patient.name,
        "dob":          patient.dob,
        "gender":       patient.gender,
        "bloodType":    patient.bloodType,
        "notes":        patient.notes,
        "doctorId":     patient.doctorId,
        "createdAt":    datetime.utcnow().isoformat(),
    }
    inserted       = patients.insert_one(doc)
    doc["_id"]     = inserted.inserted_id
    doc["scanCount"] = 0
    doc["lastScan"]  = "—"
    doc["age"]       = calc_age(patient.dob)
    return serialize(doc)


@app.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    doc = find_patient(patient_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    pid           = str(doc["_id"])
    scan_count    = scans.count_documents({"patientId": pid})
    last_scan_doc = scans.find_one({"patientId": pid}, sort=[("date", -1)])
    last_scan     = last_scan_doc["date"][:10] if last_scan_doc else "—"
    p             = serialize(doc)
    p["scanCount"] = scan_count
    p["lastScan"]  = last_scan
    p["age"]       = calc_age(p.get("dob", ""))
    return p


@app.put("/patients/{patient_id}")
async def update_patient(patient_id: str, update: PatientUpdate):
    doc = find_patient(patient_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    fields = {k: v for k, v in update.dict().items() if v is not None}
    if fields:
        patients.update_one({"_id": doc["_id"]}, {"$set": fields})
    return serialize(patients.find_one({"_id": doc["_id"]}))


@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str):
    doc = find_patient(patient_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    pid = str(doc["_id"])
    scans.delete_many({"patientId": pid})
    patients.delete_one({"_id": doc["_id"]})
    return {"message": "Patient and associated scans deleted"}


# ══════════════════════════════════════════════════════════════
#  SCAN HISTORY ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.get("/scans")
async def get_scans(
    patientId: str = "",
    doctorId:  str = "",
    limit:     int = 50,
):
    query: dict = {}
    if patientId:
        query["patientId"] = patientId
    if doctorId:
        query["doctorId"] = doctorId
    docs = list(scans.find(query).sort("date", -1).limit(limit))
    return [serialize(d) for d in docs]


@app.get("/scans/{scan_id}")
async def get_scan(scan_id: str):
    doc = scans.find_one({"_id": ObjectId(scan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Scan not found")
    return serialize(doc)


@app.delete("/scans/{scan_id}")
async def delete_scan(scan_id: str):
    if not scans.find_one({"_id": ObjectId(scan_id)}):
        raise HTTPException(status_code=404, detail="Scan not found")
    scans.delete_one({"_id": ObjectId(scan_id)})
    return {"message": "Scan deleted"}