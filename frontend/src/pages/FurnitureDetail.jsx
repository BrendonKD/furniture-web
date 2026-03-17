import React, {
  useState, useEffect, useRef,
  useLayoutEffect, useMemo, Suspense,
} from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Bounds } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import api from "../api/axiosInstance";
import "./FurnitureDetail.css";

/* ═══════════════════════════════════════════════
   HELPERS  (same logic as AddFurniture)
═══════════════════════════════════════════════ */
function measureScene(scene) {
  const tmp = scene.clone(true);
  tmp.traverse((n) => {
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

  const biggest = Math.max(size.x, size.y, size.z);
  const toCm    = biggest > 10 ? 1 : 100;

  return {
    width:  Math.max(1, Math.round(size.x * toCm)),
    height: Math.max(1, Math.round(size.y * toCm)),
    depth:  Math.max(1, Math.round(size.z * toCm)),
  };
}

/* ── 3-D preview (reuses AddFurniture's pattern) ── */
function ModelPreview({ glbUrl, onMeasured }) {
  const { scene } = useGLTF(glbUrl);

  useLayoutEffect(() => {
    scene.traverse((c) => {
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

const CATEGORIES = [
  "table","chair","sofa","bed","cabinet","shelf","lamp","other",
];

/* ═══════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════ */
export default function FurnitureDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  /* form state */
  const [form, setForm] = useState({
    name: "", category: "", price: "", sku: "",
    inventoryStatus: true,
    description: "",
    dimensions: { width: "", height: "", depth: "" },
  });

  /* GLB / preview */
  const [previewUrl,        setPreviewUrl]        = useState(null);  // blob URL of NEW file
  const [existingFilename,  setExistingFilename]  = useState("");    // filename on server
  const [newFileName,       setNewFileName]       = useState("");    // new file chosen
  const [dimSource,         setDimSource]         = useState(null);  // null | 'auto' | 'manual'
  const [dimLocked,         setDimLocked]         = useState(false);

  /* page state */
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(false);

  const fileInputRef = useRef();

  /* cleanup blob URL on unmount */
  useEffect(
    () => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); },
    [previewUrl],
  );

  /* ── Load existing item ─────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res  = await api.get(`admin/furniture/${id}`);
        const item = res.data;
        setForm({
          name:            item.name            || "",
          category:        item.category        || "",
          price:           item.price           || "",
          sku:             item.sku             || "",
          inventoryStatus: item.inventoryStatus ?? true,
          description:     item.description     || "",
          dimensions: {
            width:  item.dimensions?.width  || "",
            height: item.dimensions?.height || "",
            depth:  item.dimensions?.depth  || "",
          },
        });
        /* keep track of existing GLB filename for display */
        setExistingFilename(item.glbFilename || "");
      } catch {
        setError("Failed to load item.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── Auto-measure from new GLB ──────────────── */
  const handleMeasured = useMemo(
    () => (dims) => {
      if (dimLocked) return;
      setForm((p) => ({
        ...p,
        dimensions: {
          width:  String(dims.width),
          height: String(dims.height),
          depth:  String(dims.depth),
        },
      }));
      setDimSource("auto");
    },
    [dimLocked],
  );

  /* ── File picker ────────────────────────────── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      alert("Please select a .glb or .gltf file");
      e.target.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setNewFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    setDimSource(null);
    setDimLocked(false);
    setForm((p) => ({ ...p, dimensions: { width: "", height: "", depth: "" } }));
  };

  /* ── Dimension change (manual override) ──────── */
  const handleDimChange = (dim, val) => {
    setDimLocked(true);
    setDimSource("manual");
    setForm((p) => ({ ...p, dimensions: { ...p.dimensions, [dim]: val } }));
  };

  /* ── Submit ─────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const dims = {
      width:  Number(form.dimensions.width)  || 0,
      height: Number(form.dimensions.height) || 0,
      depth:  Number(form.dimensions.depth)  || 0,
    };

    try {
      if (fileInputRef.current?.files[0]) {
        /* If a new GLB was chosen → multipart/form-data (same as Add) */
        const fd = new FormData();
        fd.append("name",            form.name);
        fd.append("category",        form.category);
        fd.append("price",           form.price);
        fd.append("sku",             form.sku);
        fd.append("inventoryStatus", form.inventoryStatus);
        fd.append("dimensions",      JSON.stringify(dims));
        fd.append("description",     form.description);
        fd.append("glbFile",         fileInputRef.current.files[0]);

        await api.put(`admin/furniture/${id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
      } else {
        /* No new file → plain JSON update */
        await api.put(`admin/furniture/${id}`, {
          ...form,
          price:      parseFloat(form.price),
          dimensions: dims,
        });
      }

      setSuccess(true);
      setTimeout(() => navigate("/admin/furniture"), 1600);
    } catch (err) {
      setError(`Failed to save: ${err.response?.data?.message || err.message}`);
      setSaving(false);
    }
  };

  const hasDims =
    form.dimensions.width &&
    form.dimensions.height &&
    form.dimensions.depth;

  /* ── Loading ────────────────────────────────── */
  if (loading) {
    return (
      <div className="fd-shell">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", gap:12, color:"#9a8a72" }}>
          <div className="fd-spin" />
          Loading item…
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="fd-shell">

      {/* ── HEADER ───────────────────────────── */}
      <header className="fd-header">
        <Link to="/admin/furniture" className="fd-back">
          <span className="material-icons-round">arrow_back</span>
          Inventory
        </Link>
        <div className="fd-header-text">
          <h1>Edit Furniture</h1>
          <p>Update details or replace the 3D model for this item</p>
        </div>
      </header>

      {/* ── ALERTS ───────────────────────────── */}
      {error && (
        <div className="fd-alert fd-alert-error">
          <span className="material-icons-round">error_outline</span>
          {error}
        </div>
      )}
      {success && (
        <div className="fd-alert fd-alert-success">
          <span className="material-icons-round">check_circle</span>
          Saved successfully — redirecting…
        </div>
      )}

      {/* ── FORM ─────────────────────────────── */}
      <form onSubmit={handleSubmit} className="fd-form">
        <div className="fd-layout">

          {/* ════════════════════════════════════
              LEFT COLUMN
          ════════════════════════════════════ */}
          <div className="fd-left">

            {/* General info */}
            <div className="fd-card">
              <div className="fd-card-label">General information</div>

              <div className="fd-field">
                <label>Furniture name <span className="fd-req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Handcrafted Dining Table"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="fd-row">
                <div className="fd-field">
                  <label>Category <span className="fd-req">*</span></label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fd-field">
                  <label>Price (LKR) <span className="fd-req">*</span></label>
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

              <div className="fd-field">
                <label>SKU</label>
                <div className="fd-sku">
                  <input
                    type="text"
                    placeholder="FVT-2026-001"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                  <button
                    type="button"
                    className="fd-sku-btn"
                    onClick={() =>
                      setForm({ ...form, sku: `FVT-${Date.now().toString().slice(-6)}` })
                    }
                  >
                    Auto-generate
                  </button>
                </div>
              </div>

              <label className="fd-toggle-row">
                <div className="fd-toggle-wrap">
                  <input
                    type="checkbox"
                    checked={form.inventoryStatus}
                    onChange={(e) =>
                      setForm({ ...form, inventoryStatus: e.target.checked })
                    }
                  />
                  <span className="fd-track">
                    <span className="fd-thumb" />
                  </span>
                </div>
                <span>In stock</span>
              </label>
            </div>

            {/* Dimensions */}
            <div className="fd-card">
              <div className="fd-card-label-row">
                <span className="fd-card-label">Dimensions (cm)</span>
                <div className="fd-badges">
                  {dimSource === "auto" && !dimLocked && (
                    <span className="fd-chip fd-chip-auto">
                      <span className="material-icons-round" style={{ fontSize: 13 }}>
                        auto_fix_high
                      </span>
                      Auto-measured
                    </span>
                  )}
                  {dimSource === "manual" && (
                    <span className="fd-chip fd-chip-manual">
                      <span className="material-icons-round" style={{ fontSize: 13 }}>
                        edit
                      </span>
                      Manual
                    </span>
                  )}
                </div>
              </div>

              <p className="fd-dim-note">
                {previewUrl
                  ? "Dimensions were auto-measured from the new model. Edit below to override."
                  : existingFilename
                    ? "Replace the 3D model to auto-measure new dimensions, or edit manually."
                    : "Upload a .GLB model and dimensions will be filled automatically."}
              </p>

              <div className="fd-dims-grid">
                {[
                  ["width",  "↔", "Width" ],
                  ["height", "↕", "Height"],
                  ["depth",  "⇔", "Depth" ],
                ].map(([dim, icon, label]) => (
                  <div className="fd-dim-cell" key={dim}>
                    <div className="fd-dim-icon">{icon}</div>
                    <label>{label}</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="—"
                      value={form.dimensions[dim]}
                      onChange={(e) => handleDimChange(dim, e.target.value)}
                    />
                    <span className="fd-dim-unit">cm</span>
                  </div>
                ))}
              </div>

              {hasDims && (
                <div className="fd-dim-summary">
                  <span>
                    {form.dimensions.width} × {form.dimensions.height} × {form.dimensions.depth} cm
                  </span>
                  <span className="fd-dim-metres">
                    ({(form.dimensions.width / 100).toFixed(2)}m ×&nbsp;
                    {(form.dimensions.height / 100).toFixed(2)}m ×&nbsp;
                    {(form.dimensions.depth / 100).toFixed(2)}m)
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="fd-card">
              <div className="fd-card-label">
                Description&nbsp;
                <span className="fd-optional">— optional</span>
              </div>
              <textarea
                rows={4}
                placeholder="Describe the materials, craftsmanship, and story behind this piece…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

          </div>{/* /fd-left */}

          {/* ════════════════════════════════════
              RIGHT COLUMN — 3D Preview
          ════════════════════════════════════ */}
          <div className="fd-right">
            <div className="fd-card fd-preview-card">
              <div className="fd-card-label">3D model</div>

              {/* Upload / replace button */}
              <label htmlFor="glb-upload" className="fd-upload-btn">
                <span className="material-icons-round">cloud_upload</span>
                {newFileName ? "Replace model again" : existingFilename ? "Replace 3D model" : "Upload .GLB / .GLTF"}
              </label>
              <input
                id="glb-upload"
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {/* New file chip */}
              {newFileName && (
                <div className="fd-file-chip">
                  <span className="material-icons-round" style={{ fontSize: 14, color: "#e3b566" }}>
                    view_in_ar
                  </span>
                  <span className="fd-file-name">{newFileName}</span>
                  <span className="fd-file-badge">NEW</span>
                </div>
              )}

              {/* Existing file chip (shown when no new file chosen yet) */}
              {!newFileName && existingFilename && (
                <div className="fd-existing-chip">
                  <span className="material-icons-round">check_circle</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {existingFilename}
                  </span>
                  <span className="fd-existing-label">CURRENT</span>
                </div>
              )}

              {/* Canvas */}
              <div className="fd-canvas">
                {previewUrl ? (
                  <Suspense
                    fallback={
                      <div className="fd-canvas-loading">
                        <div className="fd-spin" />
                        <span>Loading model…</span>
                      </div>
                    }
                  >
                    <Canvas
                      camera={{ position: [0, 0, 5], fov: 50 }}
                      gl={{ antialias: true, powerPreference: "high-performance" }}
                      shadows
                      frameloop="always"
                    >
                      <color attach="background" args={["#0f0f0f"]} />
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
                      <ModelPreview glbUrl={previewUrl} onMeasured={handleMeasured} />
                      <OrbitControls
                        enablePan={false}
                        enableZoom
                        minDistance={1}
                        maxDistance={20}
                        autoRotate
                        autoRotateSpeed={1.5}
                      />
                    </Canvas>
                  </Suspense>
                ) : (
                  <div className="fd-canvas-empty">
                    <span className="material-icons-round">view_in_ar</span>
                    <p>
                      {existingFilename
                        ? "Upload a replacement .GLB to preview it here"
                        : "Upload a .GLB model to preview it here"}
                    </p>
                    <p className="fd-canvas-sub">
                      Dimensions will be auto-measured from the new model
                    </p>
                  </div>
                )}
              </div>

              {/* Dimension badge row under canvas */}
              {hasDims && (
                <div className="fd-preview-dims">
                  <span>W&nbsp;{form.dimensions.width}cm</span>
                  <span>H&nbsp;{form.dimensions.height}cm</span>
                  <span>D&nbsp;{form.dimensions.depth}cm</span>
                </div>
              )}
            </div>
          </div>

        </div>{/* /fd-layout */}

        {/* ── ACTIONS ──────────────────────── */}
        <div className="fd-actions">
          <Link to="/admin/furniture" className="fd-cancel">
            Cancel
          </Link>
          <button type="submit" className="fd-save" disabled={saving}>
            {saving ? (
              <>
                <div className="fd-btn-spin" />
                Saving changes…
              </>
            ) : (
              <>
                <span className="material-icons-round">save</span>
                Save changes
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}