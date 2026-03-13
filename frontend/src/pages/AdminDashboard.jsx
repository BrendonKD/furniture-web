import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import "./AdminDashboard.css"; 

const AdminDashboard = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const userName = "Elias (Admin)"; 

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
        
        // Use public admin endpoint - no token needed
        const res = await fetch(`${API_BASE}/designs/admin`);
        
        if (!res.ok) {
          console.error("Admin fetch failed:", res.status);
          setDesigns([]); 
          return;
        }
        
        const data = await res.json();
        console.log("✅ Loaded", data.length, "designs");
        setDesigns(data);
      } catch (err) {
        console.error("Admin fetch error:", err);
        setDesigns([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  // Fix: Use design.name instead of non-existent customerName
  const filteredDesigns = designs.filter(design => 
    design.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Loading admin panel...</div>;

  return (
    <div className="admin-wrapper">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <div className="logo">
            <span className="material-icons-round">chair</span>
            <h1>EVERWOOD & CO.</h1>
          </div>
          
        </div>
        <div className="header-right">
          <div className="user-greeting">
            <span>Welcome, {userName}</span>
          </div>
          <div className="profile">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWxIedx0Jkes_aoziGT3DZUuEjR3HGLGcB1VezRK2yPiLyixm9dQNwIzkMaLryxmoU9CDPvYKcNn10pAUvuDDF_9vtYSY9nDAQyRdWRzblpZyphDMsMA7keSLyck65R4Qx-xo4p0rGBVAyUbG5SgQUQ7b-7BNN6fqrqhLXi-7LSMf5F82vEVrAr-FQGOamDzUorLP1tzNiq4bMKVDSdY1kEE74d9VURwhV6LqHiNGUOEYu4_kHXIi7Gqo2-5ngPE4P66ReqiKSS8c" alt="Admin" />
          </div>
        </div>
      </header>

      <main className="admin-main">
        {/* Hero Banner */}
        <section className="admin-hero">
          <div className="hero-content">
            <h1>Welcome, {userName}</h1>
            <p>Ready to craft beautiful designs? (Admin) <br/> 
               Manage designs with customer or browse design library all designs in your entire room</p>
            <div className="hero-buttons">
              <Link to="/admin/create-session" className="btn-primary">
                <span className="material-icons-round">design_services</span>
                Design session with customer
              </Link>
              <Link to="/admin/furniture" className="btn-secondary">
                <span className="material-icons-round">inventory_2</span>
                Browse Furniture
              </Link>
              <Link to="/admin/add-furniture" className="btn-add">
                <span className="material-icons-round">add</span>
                Add Furniture
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-icons-round">dashboard</span>
            </div>
            <div className="stat-info">
              <span className="stat-label">Total</span>
              <span className="stat-value">{designs.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-icons-round">timeline</span>
            </div>
            <div className="stat-info">
              <span className="stat-label">This week</span>
              <span className="stat-value">18</span>
            </div>
          </div>
          <div className="stat-card active">
            <div className="stat-icon">
              <span className="material-icons-round">check_circle</span>
            </div>
            <div className="stat-info">
              <span className="stat-label">Active</span>
              <span className="stat-value">42</span>
            </div>
          </div>
        </section>


        {/* Design Library Table */}
        <section className="table-section">
          <div className="table-header">
            <h2>Design Library</h2>
            <span className="count">{filteredDesigns.length} designs</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Furniture</th>
                  <th>Bookings</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Last Modified</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDesigns.slice(0, 5).map((design, i) => (
                  <tr key={design._id || i}>
                    <td>
                      <div className="furniture-item">
                        <div className="thumb" />
                        <span>{design.name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td>12</td>
                    <td><span className="status in-progress">In Progress</span></td>
                    <td>{design.ownerId?.name || "Unknown"}</td>
                    <td>{design.updatedAt ? new Date(design.updatedAt).toLocaleString() : "Never"}</td>
                    <td><span className="status-badge blue">Customer required</span></td>
                    <td>
                      <div className="actions">
                        <button className="action-icon">
                          <span className="material-icons-round">edit</span>
                        </button>
                        <button className="action-icon">
                          <span className="material-icons-round">delete</span>
                        </button>
                        <Link 
                          to={`/admin/create-session?designId=${design._id}`} 
                          className="action-icon view"
                          title="View Design"
                        >
                          <span className="material-icons-round">visibility</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDesigns.length === 0 && (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No designs found. Create some in Room Designer first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
