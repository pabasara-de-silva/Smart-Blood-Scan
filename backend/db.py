import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db     = client[os.getenv("DB_NAME")]

# ── Collections ───────────────────────────────────────────────
users    = db["users"]       
patients = db["patients"]    
scans    = db["scans"]       

# ── Indexes ───────────────────────────────────────────────────
# Prevent duplicate doctor accounts
users.create_index("email", unique=True)
users.create_index("licenseNo", unique=True, sparse=True)

# Fast lookup: all patients for a doctor, sorted newest-first
patients.create_index([("doctorId", 1), ("createdAt", -1)])

# Fast lookup: all scans for a patient, or for a doctor
scans.create_index([("patientId", 1), ("date", -1)])
scans.create_index([("doctorId",  1), ("date", -1)])
