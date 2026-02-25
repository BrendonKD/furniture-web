import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import "./AdminDashboard.css"; 

const AdminDashboard = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const userName = "Elias (Admin)";  // From auth

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const res = await api.get("/api/designs");  // All designs for admin
        setDesigns(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  const filteredDesigns = designs.filter(design => 
    design.customerName.toLowerCase().includes(search.toLowerCase())
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
          <nav className="breadcrumb">
            <span>Dashboard</span>
          </nav>
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
                Browse designs
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
              <span className="stat-value">124</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-icons-round">timeline</span>
            </div>
            <div className="stat-info">
              <span className="stat-label">18 this week</span>
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
            <div className="table-actions">
              <Link to="/admin/add-furniture" className="btn-add">
                <span className="material-icons-round">add</span>
                Add Furniture
              </Link>
            </div>
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
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDesigns.slice(0, 5).map((design, i) => (  // Show 5 like screenshot
                  <tr key={i}>
                    <td>
                      <div className="furniture-item">
                        <div className="thumb" />
                        <span>{design.name}</span>
                      </div>
                    </td>
                    <td>12</td>
                    <td><span className="status in-progress">In Progress</span></td>
                    <td>James Wilson</td>
                    <td>2h ago</td>
                    <td><span className="status-badge blue">Customer required</span></td>
                    <td className="notes">Scandinavian master...</td>
                    <td>
                      <div className="actions">
                        <button className="action-icon">
                          <span className="material-icons-round">edit</span>
                        </button>
                        <button className="action-icon">
                          <span className="material-icons-round">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
