import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import "./FurnitureDetail.css";

const CATEGORIES = ["sofa", "chair", "table", "bed", "wardrobe", "desk", "shelf", "other"];

const FurnitureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    sku: "",
    inventoryStatus: true,
    description: "",
    dimensions: { width: "", height: "", depth: "" },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const res = await api.get(`admin/furniture/${id}`);
      const item = res.data;
      setForm({
        name: item.name || "",
        category: item.category || "",
        price: item.price || "",
        sku: item.sku || "",
        inventoryStatus: item.inventoryStatus ?? true,
        description: item.description || "",
        dimensions: {
          width: item.dimensions?.width || "",
          height: item.dimensions?.height || "",
          depth: item.dimensions?.depth || "",
        },
      });
      setLoading(false);
    } catch (err) {
      setError("Failed to load item.");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("dim_")) {
      const dim = name.replace("dim_", "");
      setForm((prev) => ({
        ...prev,
        dimensions: { ...prev.dimensions, [dim]: value },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`admin/furniture/${id}`, {
        ...form,
        price: parseFloat(form.price),
        dimensions: {
          width: parseFloat(form.dimensions.width) || 0,
          height: parseFloat(form.dimensions.height) || 0,
          depth: parseFloat(form.dimensions.depth) || 0,
        },
      });
      setSuccess(true);
      setTimeout(() => navigate("/admin/furniture"), 1500);
    } catch (err) {
      setError("Failed to save changes.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="loading-container">
          <span className="material-icons-round spinning">autorenew</span>
          <p>Loading item...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-container">
      {/* Header */}
      <div className="detail-header">
        <Link to="/admin/furniture" className="back-link">
          <span className="material-icons-round">arrow_back</span>
          Furniture List
        </Link>
        <div className="header-right">
          <h1>Edit Item</h1>
          <span className="subtitle">Update furniture details</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <span className="material-icons-round">error</span>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span className="material-icons-round">check_circle</span>
          Saved! Redirecting...
        </div>
      )}

      {/* Form */}
      <form className="detail-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Name */}
          <div className="field full-width">
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Everwood Lounge Chair"
            />
          </div>

          {/* Category */}
          <div className="field">
            <label>Category *</label>
            <select name="category" value={form.category} onChange={handleChange} required>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div className="field">
            <label>Price (USD) *</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          {/* SKU */}
          <div className="field">
            <label>SKU</label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="e.g. FVT-101898"
            />
          </div>

          {/* Inventory Status */}
          <div className="field status-field">
            <label>Inventory Status</label>
            <label className="toggle">
              <input
                type="checkbox"
                name="inventoryStatus"
                checked={form.inventoryStatus}
                onChange={handleChange}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {form.inventoryStatus ? "In Stock" : "Out of Stock"}
              </span>
            </label>
          </div>

          {/* Description */}
          <div className="field full-width">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the furniture piece..."
              rows={4}
            />
          </div>

          {/* Dimensions */}
          <div className="field full-width">
            <label>Dimensions (cm)</label>
            <div className="dimensions-row">
              <div className="dim-field">
                <span>Width</span>
                <input
                  type="number"
                  name="dim_width"
                  value={form.dimensions.width}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
              </div>
              <span className="dim-sep">×</span>
              <div className="dim-field">
                <span>Height</span>
                <input
                  type="number"
                  name="dim_height"
                  value={form.dimensions.height}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
              </div>
              <span className="dim-sep">×</span>
              <div className="dim-field">
                <span>Depth</span>
                <input
                  type="number"
                  name="dim_depth"
                  value={form.dimensions.depth}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <Link to="/admin/furniture" className="btn-cancel">
            Cancel
          </Link>
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? (
              <>
                <span className="material-icons-round spinning">autorenew</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-icons-round">save</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FurnitureDetail;