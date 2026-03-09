import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import "./FurnitureList.css";

const FurnitureList = () => {
  const [furniture, setFurniture] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFurniture();
  }, []);

  // Apply filter whenever furniture list or filter changes
  useEffect(() => {
    if (activeFilter === "all") {
      setFiltered(furniture);
    } else if (activeFilter === "instock") {
      setFiltered(furniture.filter((item) => item.inventoryStatus));
    } else if (activeFilter === "outstock") {
      setFiltered(furniture.filter((item) => !item.inventoryStatus));
    }
  }, [furniture, activeFilter]);

  const fetchFurniture = async () => {
    try {
      setLoading(true);
      const response = await api.get("admin/furniture");
      setFurniture(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load furniture");
      setLoading(false);
      console.error("Fetch error:", err);
    }
  };

  // ✅ FIX: Delete now calls the API
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`admin/furniture/${id}`);
      setFurniture((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete item. Please try again.");
    }
  };

  // ✅ FIX: GLB files can't be used as images.
  // We show a stylised 3D-model placeholder instead.
  const getImageSrc = (item) => {
    // If your backend later adds an imagePath or thumbnailUrl field, use it:
    if (item.imagePath) return item.imagePath;
    if (item.thumbnailUrl) return item.thumbnailUrl;
    // Otherwise fall back to a generated placeholder
    return null;
  };

  if (loading) {
    return (
      <div className="furniture-list-container">
        <div className="page-header">
          <Link to="/admin" className="back-link">
            <span className="material-icons-round">arrow_back</span>
            Dashboard
          </Link>
          <div className="header-right">
            <h1>Furniture Inventory</h1>
            <span className="subtitle">Manage your furniture collection</span>
          </div>
        </div>
        <div className="loading-container">
          <span className="material-icons-round spinning">inventory_2</span>
          <p>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="furniture-list-container">
      {/* Header */}
      <div className="page-header">
        <Link to="/admin" className="back-link">
          <span className="material-icons-round">arrow_back</span>
          Dashboard
        </Link>
        <div className="header-right">
          <h1>Furniture Inventory</h1>
          <span className="subtitle">{furniture.length} items in inventory</span>
        </div>
      </div>

      {/* Controls */}
      <div className="list-controls">
        <Link to="/admin/add-furniture" className="btn-primary">
          <span className="material-icons-round">add</span>
          Add New Item
        </Link>
        <div className="status-filters">
          <button
            className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${activeFilter === "instock" ? "active" : ""}`}
            onClick={() => setActiveFilter("instock")}
          >
            In Stock
          </button>
          <button
            className={`filter-btn ${activeFilter === "outstock" ? "active" : ""}`}
            onClick={() => setActiveFilter("outstock")}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner">
          <span className="material-icons-round">error</span>
          {error}
          <button onClick={fetchFurniture} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="furniture-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons-round">inventory_2</span>
            <h3>No furniture found</h3>
            <p>
              {activeFilter !== "all"
                ? "No items match this filter"
                : "Add your first item to get started"}
            </p>
            {activeFilter === "all" && (
              <Link to="/admin/add-furniture" className="btn-secondary">
                Add First Item
              </Link>
            )}
          </div>
        ) : (
          filtered.map((item) => {
            const imgSrc = getImageSrc(item);
            return (
              <div key={item._id} className="furniture-card">
                {/* ✅ FIX: Show placeholder box with 3D icon when no image exists */}
                <div className="card-image">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={item.name}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="glb-placeholder"
                    style={{ display: imgSrc ? "none" : "flex" }}
                  >
                    <span className="material-icons-round">view_in_ar</span>
                    <span className="glb-label">3D Model</span>
                    <span className="glb-filename">
                      {item.glbFilename || "model.glb"}
                    </span>
                  </div>
                  <div className="card-status">
                    {item.inventoryStatus ? (
                      <span className="status-instock">
                        <span className="material-icons-round">check_circle</span>
                        In Stock
                      </span>
                    ) : (
                      <span className="status-outstock">
                        <span className="material-icons-round">schedule</span>
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="item-name">{item.name}</h3>
                  <div className="item-meta">
                    <span className="category">{item.category}</span>
                    <span className="sku">#{item.sku}</span>
                  </div>
                  <div className="price-section">
                    <span className="price">${parseFloat(item.price).toFixed(2)}</span>
                    <div className="dimensions">
                      <span>
                        {item.dimensions?.width || 0}×{item.dimensions?.height || 0}×
                        {item.dimensions?.depth || 0}cm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  {/* ✅ FIX: Route now exists in App.jsx */}
                  <Link to={`/admin/furniture/${item._id}`} className="btn-secondary">
                    <span className="material-icons-round">edit</span>
                    Edit
                  </Link>
                  {/* ✅ FIX: Delete now actually calls API */}
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(item._id, item.name)}
                  >
                    <span className="material-icons-round">delete</span>
                    Delete
                  </button>
                  {/* ✅ FIX: Route now exists in App.jsx */}
                  <Link to={`/furniture/${item._id}`} className="btn-preview">
                    <span className="material-icons-round">visibility</span>
                    Preview
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FurnitureList;