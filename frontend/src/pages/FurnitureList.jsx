import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosInstance";
import "./FurnitureList.css";

const FurnitureList = () => {
  const [furniture, setFurniture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFurniture();
  }, []);

  const fetchFurniture = async () => {
    try {
      const response = await api.get("admin/furniture");  // Matches your backend
      setFurniture(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load furniture");
      setLoading(false);
      console.error("Fetch error:", err);
    }
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
          <span className="material-icons-round">inventory_2</span>
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
          <span className="subtitle">
            {furniture.length} items in inventory
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="list-controls">
        <Link to="/admin/add-furniture" className="btn-primary">
          <span className="material-icons-round">add</span>
          Add New Item
        </Link>
        <div className="status-filters">
          <button className="filter-btn active">All</button>
          <button className="filter-btn">In Stock</button>
          <button className="filter-btn">Out of Stock</button>
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
        {furniture.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons-round">inventory_2</span>
            <h3>No furniture yet</h3>
            <p>Add your first item to get started</p>
            <Link to="/admin/add-furniture" className="btn-secondary">
              Add First Item
            </Link>
          </div>
        ) : (
          furniture.map((item) => (
            <div key={item._id} className="furniture-card">
              <div className="card-image">
                <img 
                  src={item.glbPath} 
                  alt={item.name}
                  onError={(e) => {
                    e.target.src = '/placeholder-furniture.jpg';  // Fallback
                  }}
                />
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
                    <span>{item.dimensions?.width || 0}×{item.dimensions?.height || 0}×{item.dimensions?.depth || 0}cm</span>
                  </div>
                </div>
              </div>
              
              <div className="card-actions">
                <Link to={`/admin/furniture/${item._id}`} className="btn-secondary">
                  <span className="material-icons-round">edit</span>
                  Edit
                </Link>
                <button className="btn-danger">
                  <span className="material-icons-round">delete</span>
                  Delete
                </button>
                <Link to={`/furniture/${item._id}`} className="btn-preview">
                  <span className="material-icons-round">visibility</span>
                  Preview
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FurnitureList;
