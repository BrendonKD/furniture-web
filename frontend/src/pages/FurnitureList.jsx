import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader }    from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import api from "../api/axiosInstance";
import "./FurnitureList.css";

const BACKEND = "http://localhost:5000";

const FILTERS = [
  { key: "all",      label: "All"          },
  { key: "instock",  label: "In Stock"     },
  { key: "outstock", label: "Out of Stock" },
];

/* ═══════════════════════════════════════════════
   MINI 3D VIEWER
   bgLight prop: false = dark scene, true = light scene
═══════════════════════════════════════════════ */
function MiniViewer({ glbPath, dims, bgLight }) {
  const mountRef   = useRef(null);
  const rafRef     = useRef(null);
  const sceneRef   = useRef(null);
  const rendererRef= useRef(null);
  const [ready,  setReady]  = useState(false);
  const [failed, setFailed] = useState(false);

  /* ── Change background + floor when bgLight toggles ── */
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current) return;
    const darkBg   = new THREE.Color("#1a1512");
    const lightBg  = new THREE.Color("#f5f0eb");
    const darkFloor  = 0x201b17;
    const lightFloor = 0xe8e0d6;

    sceneRef.current.background = bgLight ? lightBg : darkBg;

    /* Update ground mesh color */
    sceneRef.current.traverse(obj => {
      if (obj.isMesh && obj.userData.isGround) {
        obj.material.color.set(bgLight ? lightFloor : darkFloor);
      }
    });
  }, [bgLight]);

  /* ── Build Three.js scene once ── */
  useEffect(() => {
    if (!glbPath || !mountRef.current) return;

    const mount = mountRef.current;
    const W = mount.clientWidth  || 260;
    const H = mount.clientHeight || 160;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a1512");
    sceneRef.current = scene;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* Camera */
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 200);
    camera.position.set(3, 2, 3);

    /* Controls */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.06;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 1.2;
    controls.enablePan       = false;
    controls.enableZoom      = false;
    controls.maxPolarAngle   = Math.PI / 2.1;
    controls.target.set(0, 0.5, 0);
    controls.update();

    /* Lights */
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(4, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.bias = -0.001;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xc9922a, 0.25);
    fill.position.set(-4, 2, -4);
    scene.add(fill);

    /* Ground — tagged so we can recolor it */
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x201b17,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);

    /* Grid lines — also tagged */
    const grid = new THREE.GridHelper(20, 20, 0x3a332c, 0x3a332c);
    grid.position.y = 0.002;
    grid.userData.isGrid = true;
    scene.add(grid);

    /* Load GLB */
    const url = `${BACKEND}${glbPath.startsWith("/") ? "" : "/"}${glbPath}`;
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });

        /* Scale to ~2 units */
        const box  = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = maxDim > 0 ? 2 / maxDim : 1;
        model.scale.setScalar(scale);

        /* Re-measure after scale */
        const sBox    = new THREE.Box3().setFromObject(model);
        const sCenter = new THREE.Vector3();
        const sSize   = new THREE.Vector3();
        sBox.getCenter(sCenter);
        sBox.getSize(sSize);

        model.position.x = -sCenter.x;
        model.position.z = -sCenter.z;
        model.position.y = -sBox.min.y;
        scene.add(model);

        const dist = Math.max(sSize.x, sSize.z) * 2.2;
        camera.position.set(dist, sSize.y * 1.3, dist);
        controls.target.set(0, sSize.y * 0.4, 0);
        controls.update();

        setReady(true);
      },
      undefined,
      () => {
        setFailed(true);
        /* Fallback box */
        const w = (Number(dims?.width)  || 100) / 100;
        const h = (Number(dims?.height) || 90)  / 100;
        const d = (Number(dims?.depth)  || 100) / 100;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 })
        );
        box.position.y = h / 2;
        box.castShadow = true;
        scene.add(box);
        camera.position.set(w * 3, h * 2, d * 3);
        controls.target.set(0, h / 2, 0);
        controls.update();
        setReady(true);
      }
    );

    /* Render loop */
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    /* Cleanup */
    return () => {
      cancelAnimationFrame(rafRef.current);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      sceneRef.current   = null;
      rendererRef.current= null;
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [glbPath]); // eslint-disable-line

  return (
    <div className="fl-mini-viewer">
      <div ref={mountRef} className="fl-mini-canvas" />
      {!ready && !failed && (
        <div className="fl-mini-loading">
          <span className="material-icons-round">view_in_ar</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FURNITURE CARD
═══════════════════════════════════════════════ */
function FurnitureCard({ item, isAdmin, onDelete }) {
  const [bgLight, setBgLight] = useState(false);

  return (
    <div className="fl-card">

      {/* ── 3D viewer / image ── */}
      <div className={`fl-img-wrap ${bgLight ? "bg-light" : ""}`}>
        {item.glbPath ? (
          <MiniViewer
            glbPath={item.glbPath}
            dims={item.dimensions}
            bgLight={bgLight}
          />
        ) : item.imagePath || item.thumbnailUrl ? (
          <img
            src={item.imagePath || item.thumbnailUrl}
            alt={item.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="fl-placeholder">
            <span className="material-icons-round">view_in_ar</span>
            <span className="fl-ph-label">No Model</span>
          </div>
        )}

        {/* Status badge */}
        <span className={`fl-status ${item.inventoryStatus ? "instock" : "outstock"}`}>
          <span className="material-icons-round">
            {item.inventoryStatus ? "check_circle" : "schedule"}
          </span>
          {item.inventoryStatus ? "In Stock" : "Out of Stock"}
        </span>

        {/* ── Background toggle button ── */}
        {item.glbPath && (
          <button
            className={`fl-bg-toggle ${bgLight ? "light" : "dark"}`}
            title={bgLight ? "Switch to dark background" : "Switch to light background"}
            onClick={() => setBgLight(v => !v)}
          >
            <span className="material-icons-round">
              {bgLight ? "dark_mode" : "light_mode"}
            </span>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="fl-body">
        <h3 className="fl-name">{item.name}</h3>
        <div className="fl-meta">
          <span className="fl-tag">{item.category}</span>
          <span className="fl-tag">#{item.sku}</span>
        </div>
        <div className="fl-price-row">
          <span className="fl-price">
            Rs. {parseFloat(item.price || 0).toFixed(2)}
          </span>
          <span className="fl-dims">
            {item.dimensions?.width || 0}×
            {item.dimensions?.height || 0}×
            {item.dimensions?.depth || 0}cm
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="fl-actions">
        {isAdmin && (
          <>
            <Link to={`/admin/furniture/${item._id}`} className="fl-action" title="Edit">
              <span className="material-icons-round">edit</span>
            </Link>
            <button className="fl-action del" title="Delete" onClick={() => onDelete(item._id, item.name)}>
              <span className="material-icons-round">delete_outline</span>
            </button>
          </>
        )}
        <Link to={`/furniture/${item._id}`} className="fl-action preview" title="3D View">
          <span className="material-icons-round">visibility</span>
        </Link>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════
   FURNITURE LIST PAGE
═══════════════════════════════════════════════ */
const FurnitureList = ({ isAdmin = true }) => {
  const [furniture,    setFurniture]    = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => { fetchFurniture(); }, []); // eslint-disable-line

  const fetchFurniture = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(isAdmin ? "admin/furniture" : "furniture");
      setFurniture(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load furniture. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`admin/furniture/${id}`);
      setFurniture(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete. Please try again.");
    }
  };

  const filtered = furniture.filter(item => {
    if (activeFilter === "instock")  return  item.inventoryStatus;
    if (activeFilter === "outstock") return !item.inventoryStatus;
    return true;
  });

  if (loading) {
    return (
      <div className="fl-page">
        <div className="fl-loading">
          <span className="material-icons-round">autorenew</span>
          Loading inventory…
        </div>
      </div>
    );
  }

  return (
    <div className="fl-page">

      {/* Top bar */}
      <div className="fl-topbar">
        <Link to={isAdmin ? "/admin" : "/dashboard"} className="fl-back">
          <span className="material-icons-round">arrow_back</span>
          Dashboard
        </Link>
        <div className="fl-title-block">
          <h1 className="fl-heading">
            {isAdmin ? "Furniture Inventory" : "Browse Furniture"}
          </h1>
          <div className="fl-sub">{furniture.length} items in catalogue</div>
        </div>
        {isAdmin && (
          <Link to="/admin/add-furniture" className="fl-btn fl-btn-amber">
            <span className="material-icons-round">add</span>
            Add New Item
          </Link>
        )}
      </div>

      {/* Controls */}
      <div className="fl-controls">
        <div className="fl-filters">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`fl-chip${activeFilter === key ? " active" : ""}`}
              onClick={() => setActiveFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="fl-sub">{filtered.length} results</span>
      </div>

      {/* Error */}
      {error && (
        <div className="fl-error">
          <span className="material-icons-round">error_outline</span>
          {error}
          <button className="fl-btn fl-btn-ghost" style={{ marginLeft: "auto" }} onClick={fetchFurniture}>
            <span className="material-icons-round">refresh</span>Retry
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="fl-grid">
        {filtered.length === 0 ? (
          <div className="fl-empty">
            <span className="material-icons-round">inventory_2</span>
            <h3>No furniture found</h3>
            <p>
              {activeFilter !== "all"
                ? "No items match this filter."
                : isAdmin ? "Add your first item to get started." : "No items available yet."}
            </p>
            {isAdmin && activeFilter === "all" && (
              <Link to="/admin/add-furniture" className="fl-btn fl-btn-amber">
                <span className="material-icons-round">add</span>Add First Item
              </Link>
            )}
          </div>
        ) : filtered.map(item => (
          <FurnitureCard
            key={item._id}
            item={item}
            isAdmin={isAdmin}
            onDelete={handleDelete}
          />
        ))}
      </div>

    </div>
  );
};

export default FurnitureList;