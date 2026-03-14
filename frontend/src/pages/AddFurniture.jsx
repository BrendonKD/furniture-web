import React, { useState, useRef, Suspense, useLayoutEffect, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center, Bounds } from "@react-three/drei";
import * as THREE from "three";
import api from "../api/axiosInstance";
import "./AddFurniture.css";

/* ─────────────────────────────────────────────────────
   Measure a GLB scene → return dimensions in cm.
   Uses strip-all-transforms technique so baked authoring
   offsets don't affect the measurement.
───────────────────────────────────────────────────── */
function measureScene(scene) {
  const tmp = scene.clone(true);
  tmp.traverse(n => {
    n.position.set(0, 0, 0);
    n.rotation.set(0, 0, 0);
    n.scale.set(1, 1, 1);
    n.updateMatrix();
  });
  tmp.updateMatrixWorld(true);

  const box  = new THREE.Box3().setFromObject(tmp);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.length() < 1e-6) return null;

  // If largest axis > 10 → already in cm; else multiply by 100 to convert m→cm
  const biggest  = Math.max(size.x, size.y, size.z);
  const toCm     = biggest > 10 ? 1 : 100;

  return {
    width:  Math.max(1, Math.round(size.x * toCm)),
    height: Math.max(1, Math.round(size.y * toCm)),
    depth:  Math.max(1, Math.round(size.z * toCm)),
  };
}

/* ─────────────────────────────────────────────────────
   3-D preview component — also fires onMeasured once
───────────────────────────────────────────────────── */
function ModelPreview({ glbUrl, onMeasured }) {
  const { scene } = useGLTF(glbUrl);

  useLayoutEffect(() => {
    scene.traverse(c => {
      if (c.isMesh) {
        c.castShadow = c.receiveShadow = true;
        if (c.material) c.material.needsUpdate = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (!scene) return;
    const dims = measureScene(scene);
    if (dims) onMeasured(dims);
  }, [scene]); // eslint-disable-line

  return (
    <Bounds fit clip observe>
      <Center>
        <primitive object={scene} dispose={null} />
      </Center>
    </Bounds>
  );
}

/* ─────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────── */
export default function AddFurniture() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", category: "", price: "", sku: "",
    inventoryStatus: true,
    dimensions: { width: "", height: "", depth: "" },
    description: "",
  });

  const [previewUrl,       setPreviewUrl]       = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading,        setUploading]         = useState(false);
  const [dimSource,        setDimSource]         = useState(null); // null | 'auto' | 'manual'
  const [dimLocked,        setDimLocked]         = useState(false);

  const fileInputRef = useRef();

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  /* Called once GLB loads in the canvas */
  const handleMeasured = useMemo(() => (dims) => {
    if (dimLocked) return;
    setForm(p => ({ ...p, dimensions: { width: String(dims.width), height: String(dims.height), depth: String(dims.depth) } }));
    setDimSource("auto");
  }, [dimLocked]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) { alert("Please select a .glb or .gltf file"); e.target.value = ""; return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadedFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    setDimSource(null);
    setDimLocked(false);
    setForm(p => ({ ...p, dimensions: { width: "", height: "", depth: "" } }));
  };

  const handleDimChange = (dim, val) => {
    setDimLocked(true);
    setDimSource("manual");
    setForm(p => ({ ...p, dimensions: { ...p.dimensions, [dim]: val } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileInputRef.current?.files[0]) { alert("Please upload a 3D model first"); return; }
    setUploading(true);
    const dims = {
      width:  Number(form.dimensions.width)  || 0,
      height: Number(form.dimensions.height) || 0,
      depth:  Number(form.dimensions.depth)  || 0,
    };
    const fd = new FormData();
    fd.append("name",            form.name);
    fd.append("category",        form.category);
    fd.append("price",           form.price);
    fd.append("sku",             form.sku);
    fd.append("inventoryStatus", form.inventoryStatus);
    fd.append("dimensions",      JSON.stringify(dims));
    fd.append("description",     form.description);
    fd.append("glbFile",         fileInputRef.current.files[0]);
    try {
      await api.post("admin/furniture", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
      alert("✅ Furniture added to inventory!");
      navigate("/admin/furniture");
    } catch (err) {
      alert(`❌ Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const hasDims = form.dimensions.width && form.dimensions.height && form.dimensions.depth;

  return (
    <div className="af-shell">

      {/* Header */}
      <header className="af-header">
        <Link to="/admin" className="af-back">
          <span className="material-icons-round">arrow_back</span>
          Inventory
        </Link>
        <div className="af-header-text">
          <h1>Add New Item</h1>
          <p>Add a new furniture piece to the global inventory</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="af-form">
        <div className="af-layout">

          {/* ══ Left ══ */}
          <div className="af-left">

            {/* General */}
            <div className="af-card">
              <div className="af-card-label">General information</div>

              <div className="af-field">
                <label>Furniture name <span className="af-req">*</span></label>
                <input type="text" placeholder="e.g. Handcrafted Dining Table"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div className="af-row">
                <div className="af-field">
                  <label>Category <span className="af-req">*</span></label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select…</option>
                    {["table","chair","sofa","bed","cabinet","shelf","lamp","other"].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="af-field">
                  <label>Price (USD) <span className="af-req">*</span></label>
                  <input type="number" step="0.01" min="0" placeholder="299.99"
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                </div>
              </div>

              <div className="af-field">
                <label>SKU</label>
                <div className="af-sku">
                  <input type="text" placeholder="FVT-2026-001"
                    value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                  <button type="button" className="af-sku-btn"
                    onClick={() => setForm({ ...form, sku: `FVT-${Date.now().toString().slice(-6)}` })}>
                    Auto-generate
                  </button>
                </div>
              </div>

              <label className="af-toggle-row">
                <div className="af-toggle-wrap">
                  <input type="checkbox" checked={form.inventoryStatus}
                    onChange={e => setForm({ ...form, inventoryStatus: e.target.checked })} />
                  <span className="af-track"><span className="af-thumb" /></span>
                </div>
                <span>In stock</span>
              </label>
            </div>

            {/* Dimensions */}
            <div className="af-card">
              <div className="af-card-label-row">
                <span className="af-card-label">Dimensions (cm)</span>
                <div className="af-badges">
                  {dimSource === "auto" && !dimLocked && (
                    <span className="af-chip af-chip-auto">
                      <span className="material-icons-round">auto_fix_high</span>
                      Auto-measured
                    </span>
                  )}
                  {dimSource === "manual" && (
                    <span className="af-chip af-chip-manual">
                      <span className="material-icons-round">edit</span>
                      Manual
                    </span>
                  )}
                </div>
              </div>

              <p className="af-dim-note">
                {previewUrl
                  ? "Dimensions were auto-measured from your model. Edit below to override."
                  : "Upload a .GLB model and dimensions will be filled automatically, or enter them manually."}
              </p>

              <div className="af-dims-grid">
                {[["width","↔","W"],["height","↕","H"],["depth","⇔","D"]].map(([dim, icon, short]) => (
                  <div className="af-dim-cell" key={dim}>
                    <div className="af-dim-icon">{icon}</div>
                    <label>{dim.charAt(0).toUpperCase()+dim.slice(1)}</label>
                    <input type="number" min="0" step="1" placeholder="—"
                      value={form.dimensions[dim]}
                      onChange={e => handleDimChange(dim, e.target.value)}
                    />
                    <span className="af-dim-unit">cm</span>
                  </div>
                ))}
              </div>

              {hasDims && (
                <div className="af-dim-summary">
                  <span>{form.dimensions.width} × {form.dimensions.height} × {form.dimensions.depth} cm</span>
                  <span className="af-dim-metres">
                    ({(form.dimensions.width/100).toFixed(2)}m ×&nbsp;
                    {(form.dimensions.height/100).toFixed(2)}m ×&nbsp;
                    {(form.dimensions.depth/100).toFixed(2)}m)
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="af-card">
              <div className="af-card-label">
                Description&nbsp;<span className="af-optional">— optional</span>
              </div>
              <textarea rows={4}
                placeholder="Describe the materials, craftsmanship, and story behind this piece…"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          {/* ══ Right: 3-D Preview ══ */}
          <div className="af-right">
            <div className="af-card af-preview-card">
              <div className="af-card-label">3D model preview</div>

              <label htmlFor="glb-upload" className="af-upload-btn">
                <span className="material-icons-round">cloud_upload</span>
                {uploadedFileName ? "Replace model" : "Upload .GLB / .GLTF"}
              </label>
              <input id="glb-upload" ref={fileInputRef} type="file"
                accept=".glb,.gltf" onChange={handleFileChange} style={{ display: "none" }} />

              {uploadedFileName && (
                <div className="af-file-chip">
                  <span className="material-icons-round" style={{ fontSize:14, color:"#e3b566" }}>view_in_ar</span>
                  <span className="af-file-name">{uploadedFileName}</span>
                  <span className="af-file-badge">GLB</span>
                </div>
              )}

              <div className="af-canvas">
                {previewUrl ? (
                  <Suspense fallback={
                    <div className="af-canvas-loading">
                      <div className="af-spin" /><span>Loading model…</span>
                    </div>
                  }>
                    <Canvas camera={{ position:[0,0,5], fov:50 }}
                      gl={{ antialias:true, powerPreference:"high-performance" }}
                      shadows frameloop="always">
                      <color attach="background" args={["#0f0f0f"]} />
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[5,10,5]} intensity={1.5} castShadow shadow-mapSize={[2048,2048]} />
                      <pointLight position={[-5,5,-5]} intensity={0.4} />
                      <hemisphereLight skyColor={0xffffff} groundColor={0x444444} intensity={0.3} />
                      <ModelPreview glbUrl={previewUrl} onMeasured={handleMeasured} />
                      <OrbitControls enablePan={false} enableZoom minDistance={1} maxDistance={20} autoRotate autoRotateSpeed={1.5} />
                    </Canvas>
                  </Suspense>
                ) : (
                  <div className="af-canvas-empty">
                    <span className="material-icons-round">view_in_ar</span>
                    <p>Upload a .GLB model to preview it here</p>
                    <p className="af-canvas-sub">Dimensions will be auto-measured from the model</p>
                  </div>
                )}
              </div>

              {hasDims && (
                <div className="af-preview-dims">
                  <span>W&nbsp;{form.dimensions.width}cm</span>
                  <span>H&nbsp;{form.dimensions.height}cm</span>
                  <span>D&nbsp;{form.dimensions.depth}cm</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="af-actions">
          <button type="button" className="af-cancel" onClick={() => navigate("/admin")} disabled={uploading}>
            Cancel
          </button>
          <button type="submit" className="af-submit" disabled={uploading || !previewUrl}>
            {uploading
              ? <><div className="af-btn-spin" />Adding to inventory…</>
              : <><span className="material-icons-round" style={{fontSize:16}}>add_circle</span>&nbsp;Add to inventory</>}
          </button>
        </div>
      </form>
    </div>
  );
}