import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {

  const user = sessionStorage.getItem("user");

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return children;

}