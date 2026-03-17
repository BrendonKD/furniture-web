import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage     from "./pages/LandingPage.jsx";
import LoginPage       from "./pages/LoginPage.jsx";
import RegisterPage    from "./pages/RegisterPage.jsx";
import UserDashboard   from "./pages/UserDashboard";
import AdminDashboard  from "./pages/AdminDashboard.jsx";
import AddFurniture    from "./pages/AddFurniture.jsx";
import FurnitureDetail from "./pages/FurnitureDetail.jsx";
import FurnitureView   from "./pages/FurnitureView.jsx";
import RoomDesigner2D  from "./pages/RoomDesigner2D.jsx";
import Room3DView      from "./pages/Room3DView.jsx";
import FurnitureList from "./pages/FurnitureList";

/* ═══════════════════════════════════════════════
   PROTECTED ROUTE
   - No token            → redirect to /login
   - adminOnly + not admin → redirect to /dashboard
═══════════════════════════════════════════════ */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role"); // "admin" | "user"

  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && role !== "admin") return <Navigate to="/dashboard" replace />;

  return children;
};

/* ═══════════════════════════════════════════════
   APP ROUTES
═══════════════════════════════════════════════ */
function App() {
  return (
    <Routes>

      {/* ── Public routes ───────────────────── */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ── User routes ─────────────────────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <UserDashboard />
        </ProtectedRoute>
      } />

      {/* User room designer — no admin controls */}
      <Route path="/room-designer" element={
        <ProtectedRoute>
          <RoomDesigner2D />
        </ProtectedRoute>
      } />

      <Route path="/browse-furniture" element={
      <ProtectedRoute>
        <FurnitureList isAdmin={false} />
      </ProtectedRoute>
    } />

      {/* User 3D view — any logged-in user */}
      <Route path="/room-3d" element={
        <ProtectedRoute>
          <Room3DView />
        </ProtectedRoute>
      } />

      {/* Furniture 3D viewer — any logged-in user */}
      <Route path="/furniture/:id" element={
        <ProtectedRoute>
          <FurnitureView />
        </ProtectedRoute>
      } />

      {/* ── Admin-only routes ────────────────── */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly={true}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/create-session" element={
        <ProtectedRoute adminOnly={true}>
          <RoomDesigner2D />
        </ProtectedRoute>
      } />

      <Route path="/admin/furniture" element={
        <ProtectedRoute adminOnly={true}>
          <FurnitureList />
        </ProtectedRoute>
      } />

      <Route path="/admin/furniture/:id" element={
        <ProtectedRoute adminOnly={true}>
          <FurnitureDetail />
        </ProtectedRoute>
      } />

      <Route path="/admin/add-furniture" element={
        <ProtectedRoute adminOnly={true}>
          <AddFurniture />
        </ProtectedRoute>
      } />

      {/* ── Catch-all → login ────────────────── */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}

export default App;