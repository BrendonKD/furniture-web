import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role"); // "admin" or "user"

  // Not logged in → go to login
  if (!token) return <Navigate to="/login" replace />;

  // Admin-only route but user is not admin → go to user dashboard
  if (adminOnly && role !== "admin") return <Navigate to="/dashboard" replace />;

  return children;
};

export default ProtectedRoute;