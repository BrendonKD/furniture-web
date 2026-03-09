import React, { useState, useRef, Suspense, useLayoutEffect, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center, Bounds } from "@react-three/drei";
import api from "../api/axiosInstance";
import "./AddFurniture.css";

// ✅ FIX: Separate component so useGLTF only runs when a URL exists
function ModelPreview({ glbUrl }) {
  const { scene } = useGLTF(glbUrl);

  useLayoutEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) child.material.needsUpdate = true;
      }
    });
  }, [scene]);

  // ✅ Use Bounds to auto-fit any model size into view — no manual scale/position needed
  return (
    <Bounds fit clip observe>
      <Center>
        <primitive object={scene} dispose={null} />
      </Center>
    </Bounds>
  );
}

const AddFurniture = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    sku: "",
    inventoryStatus: true,
    dimensions: { width: "", height: "", depth: "" },
    description: "",
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  // ✅ FIX: Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && /\.(glb|gltf)$/i.test(file.name)) {
      // Revoke previous URL before creating new one
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setUploadedFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      alert("Please select a .glb or .gltf file");
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileInputRef.current?.files[0]) {
      alert("Please upload a 3D model first");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("category", form.category);
    formData.append("price", form.price);
    formData.append("sku", form.sku);
    formData.append("inventoryStatus", form.inventoryStatus);
    formData.append("dimensions", JSON.stringify(form.dimensions));
    formData.append("description", form.description);
    formData.append("glbFile", fileInputRef.current.files[0]);
    try {
      // ✅ FIX: baseURL is already "http://localhost:5000/api"
      // so just use "admin/furniture" not "/api/admin/furniture"
      await api.post("admin/furniture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      alert("✅ Furniture added to inventory!");
      navigate("/admin/furniture");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`❌ Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="add-furniture-container">
      {/* Header */}
      <div className="page-header">
        <Link to="/admin" className="back-link">
          <span className="material-icons-round">arrow_back</span>
          Inventory
        </Link>
        <div className="header-right">
          <h1>Add New Item</h1>
          <span className="subtitle">Add new furniture item to global inventory</span>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="furniture-form">
        <div className="form-row">
          {/* Left Column */}
          <div className="form-column">
            <div className="form-section">
              <h2>General Information</h2>
              <div className="input-group">
                <label>Furniture Name *</label>
                <input
                  type="text"
                  placeholder="Handcrafted Dining Table"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="table">Table</option>
                    <option value="chair">Chair</option>
                    <option value="sofa">Sofa</option>
                    <option value="bed">Bed</option>
                    <option value="cabinet">Cabinet</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="299.99"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="input-group sku-group">
                <label>SKU</label>
                <input
                  type="text"
                  placeholder="FVT-2026-001"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
                <button
                  type="button"
                  className="sku-btn"
                  onClick={() =>
                    setForm({ ...form, sku: `FVT-${Date.now().toString().slice(-6)}` })
                  }
                >
                  Auto Generate
                </button>
              </div>
              <div className="toggle-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={form.inventoryStatus}
                    onChange={(e) =>
                      setForm({ ...form, inventoryStatus: e.target.checked })
                    }
                  />
                  <span className="toggle-slider"></span>
                  In Stock
                </label>
              </div>
            </div>

            {/* Dimensions */}
            <div className="form-section">
              <h2>Dimensions (cm)</h2>
              <div className="dimension-grid">
                {["width", "height", "depth"].map((dim) => (
                  <div className="dimension-input" key={dim}>
                    <label>{dim.charAt(0).toUpperCase() + dim.slice(1)}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={form.dimensions[dim]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          dimensions: { ...form.dimensions, [dim]: e.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - 3D Preview */}
          <div className="preview-column">
            <div className="preview-section">
              <div className="preview-header">
                <h2>3D Visualization</h2>
                <label htmlFor="glb-upload" className="upload-btn">
                  <span className="material-icons-round">cloud_upload</span>
                  Upload Model
                </label>
                <input
                  id="glb-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                {uploadedFileName && (
                  <div className="file-info">
                    <span title={uploadedFileName}>{uploadedFileName}</span>
                    <span className="file-badge">GLB</span>
                  </div>
                )}
              </div>

              <div className="model-canvas">
                {previewUrl ? (
                  <Suspense
                    fallback={
                      <div className="loading-3d">
                        <span className="material-icons-round">hourglass_empty</span>
                        Loading 3D model...
                      </div>
                    }
                  >
                    <Canvas
                      camera={{ position: [0, 0, 5], fov: 50 }}
                      gl={{
                        antialias: true,
                        powerPreference: "high-performance",
                      }}
                      shadows
                      // ✅ FIX: use "always" not "demand" when autoRotate is on
                      // "demand" + autoRotate causes context loss because
                      // OrbitControls requests frames outside React's render cycle
                      frameloop="always"
                      style={{ background: "#1a1a1a" }}
                    >
                      <ambientLight intensity={0.5} />
                      <directionalLight
                        position={[5, 10, 5]}
                        intensity={1.5}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                      />
                      <pointLight position={[-5, 5, -5]} intensity={0.4} />
                      <hemisphereLight
                        skyColor={0xffffff}
                        groundColor={0x444444}
                        intensity={0.3}
                      />

                      <ModelPreview glbUrl={previewUrl} />

                      <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        minDistance={1}
                        maxDistance={20}
                        autoRotate
                        autoRotateSpeed={1.5}
                      />
                    </Canvas>
                  </Suspense>
                ) : (
                  <div className="canvas-placeholder">
                    <span className="material-icons-round">3d_rotation</span>
                    <p>Upload .GLB model to preview here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="description-section">
          <div className="input-group full">
            <label>Product Narrative</label>
            <textarea
              rows="4"
              placeholder="Describe the materials, craftsmanship, and story behind this piece..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="hint">Optional - Share the unique story of this handcrafted piece</div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate("/admin")}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="add-btn"
            disabled={uploading || !previewUrl}
          >
            {uploading ? "Adding to Inventory..." : "Add to Inventory"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddFurniture;