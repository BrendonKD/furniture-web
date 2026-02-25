import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import "./UserDashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("All Rooms");
  const [sortBy, setSortBy] = useState("Recently Modified");
  const userName = "Elias"; 

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const res = await api.get("/api/designs");
        setDesigns(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (!localStorage.getItem("token")) navigate("/login");
    else fetchDesigns();
  }, [navigate]);

  const filteredDesigns = designs
    .filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) && 
      (roomFilter === "All Rooms" || d.roomType === roomFilter)
    )
    .sort((a, b) => sortBy === "Name (A-Z)" 
      ? a.name.localeCompare(b.name) 
      : new Date(b.updatedAt) - new Date(a.updatedAt)
    );

  if (loading) return <div className="loading-screen">Loading Artisanal Vision...</div>;

  return (
    <div className="everwood-dashboard">
      {/* Header */}
      <header className="everwood-header sticky-top">
        <div className="container-fluid px-4 px-lg-5 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-4">
            <div className="logo d-flex align-items-center gap-2">
              <span className="material-icons-round brand-icon">chair</span>
              <h1 className="h5 mb-0 fw-bolder text-white">Everwood <span>&</span> Co.</h1>
            </div>
            <nav className="d-none d-md-flex align-items-center gap-2 breadcrumb-nav">
              <Link to="/">Home</Link>
              <span className="divider">/</span>
              <span className="active">Dashboard</span>
            </nav>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end d-none d-sm-block">
              <div className="fw-bold text-white small">Hi, {userName}</div>
              <div className="text-muted extra-small">Pro Member</div>
            </div>
            <div className="profile-pill">
              <img src="https://via.placeholder.com/32" alt="Elias" className="avatar" />
              <span className="material-icons-round">expand_more</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container-fluid px-4 px-lg-5 py-5">
        {/* Hero Banner */}
        <section className="hero-banner mb-5">
          <div className="hero-overlay"></div>
          <div className="hero-content p-4 p-md-5">
            <span className="badge-member mb-3">Member Dashboard</span>
            <h2 className="display-5 fw-extrabold text-white">Welcome back, {userName}</h2>
            <p className="lead text-light-gray">Create a new room layout or continue working on your saved designs. Your artisanal vision awaits.</p>
            <button className="btn btn-primary-everwood mt-3">
              <span className="material-icons-round me-2">add_circle</span>
              Create new room design
            </button>
          </div>
        </section>

        {/* Quick Stats */}
        <div className="row g-4 mb-5">
          <div className="col-12 col-md-4">
            <div className="stat-card">
              <div>
                <div className="label">Total designs</div>
                <div className="value">{designs.length}</div>
              </div>
              <div className="icon-box"><span className="material-icons-round">architecture</span></div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="stat-card">
              <div className="truncate">
                <div className="label">Recently opened</div>
                <div className="value h5 mb-0 text-truncate">{designs[0]?.name || "-"}</div>
              </div>
              <div className="icon-box blue"><span className="material-icons-round">history</span></div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="stat-card">
              <div>
                <div className="label">Draft designs</div>
                <div className="value">{designs.filter(d => d.status === "draft").length}</div>
              </div>
              <div className="icon-box amber"><span className="material-icons-round">edit_note</span></div>
            </div>
          </div>
        </div>

        {/* Saved Designs */}
        <section className="table-section">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 border-bottom-everwood">
            <div>
              <h3 className="h4 fw-bold text-white mb-1">My saved designs</h3>
              <p className="text-muted small">Manage and edit your architectural concepts</p>
            </div>
            <button className="btn btn-outline-light-everwood">
              <span className="material-icons-round me-1 small">add</span> Create new
            </button>
          </div>

          <div className="filter-bar row g-3 mb-4">
            <div className="col-12 col-lg-6">
              <div className="search-group">
                <span className="material-icons-round">search</span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search by design name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <select className="form-select" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                <option>All Rooms</option>
                <option>Living Room</option>
                <option>Bedroom</option>
                <option>Kitchen</option>
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option>Recently Modified</option>
                <option>Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="table-card overflow-hidden">
            <div className="table-responsive">
              <table className="table table-dark-everwood mb-0">
                <thead>
                  <tr>
                    <th>Design Name</th>
                    <th>Room Type</th>
                    <th>Last Modified</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesigns.map((design, idx) => (
                    <tr key={design._id || idx}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="design-thumb" style={{ backgroundImage: `url(${design.image})` }}></div>
                          <span className="fw-bold text-amber">{design.name}</span>
                        </div>
                      </td>
                      <td><span className="badge-room">{design.roomType}</span></td>
                      <td className="text-muted small">{new Date(design.updatedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          <button className="action-btn edit"><span className="material-icons-round">edit_square</span></button>
                          <button className="action-btn copy"><span className="material-icons-round">content_copy</span></button>
                          <button className="action-btn delete"><span className="material-icons-round">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 d-flex justify-content-between align-items-center table-footer">
              <span className="small text-muted">Showing {filteredDesigns.length} designs</span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-dark-nav" disabled>Previous</button>
                <button className="btn btn-sm btn-dark-nav">Next</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="everwood-footer py-5 text-center mt-auto">
        <div className="d-flex align-items-center justify-content-center gap-2 text-muted mb-3">
          <span className="material-icons-round">chair</span>
          <span className="fw-bold text-uppercase small tracking-widest">Everwood & Co.</span>
        </div>
        <p className="text-everwood extra-small">© 2026 Everwood & Co.  All rights reserved.</p>
        
      </footer>
    </div>
  );
};

export default UserDashboard;