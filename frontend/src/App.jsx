import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import LoadingScreen from "./components/LoadingScreen";
import Landing    from "./pages/Landing";
import SignUp  from "./pages/SignUp";
import SignIn  from "./pages/SignIn";
import Classifier from "./pages/Classifier";
import History    from "./pages/History";
import PatientSelect from "./pages/PatientSelect";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
    const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <LoadingScreen message="Initialising system" />;

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<Landing />}   />
          <Route path="/signup"  element={<SignUp />} />
          <Route path="/signin"  element={<SignIn />} />  
          <Route
            path="/classify"
            element={
              <ProtectedRoute>
                <Classifier />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/patients" 
            element={
            <ProtectedRoute>
            <PatientSelect />
            </ProtectedRoute>            
            } 
          />
          <Route
            path="/reset-password/:token"
            element={<ResetPassword />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
