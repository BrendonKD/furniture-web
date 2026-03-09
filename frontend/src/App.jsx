import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AddFurniture from "./pages/AddFurniture.jsx";
import FurnitureList from "./pages/FurnitureList";
import FurnitureDetail from "./pages/FurnitureDetail.jsx"; 
import FurnitureView from "./pages/FurnitureView.jsx";       // ✅ 3D viewer page of a furniture
import RoomDesigner2D from "./pages/RoomDesigner2D.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/add-furniture" element={<AddFurniture />} />
      <Route path="/admin/furniture" element={<FurnitureList />} />
      <Route path="/admin/furniture/:id" element={<FurnitureDetail />} /> 
      <Route path="/furniture/:id" element={<FurnitureView />} />    
      <Route path="/admin/create-session" element={<RoomDesigner2D />}/>     
    </Routes>
  );
}

export default App;