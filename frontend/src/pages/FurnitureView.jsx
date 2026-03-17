import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader }    from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import api from "../api/axiosInstance";
import "./FurnitureView.css";

const BACKEND = "http://localhost:5000";

/* colour pairs for each mode */
const DARK_BG    = "#111";
const LIGHT_BG   = "#f0ebe4";
const DARK_FLOOR  = 0x201b17;
const LIGHT_FLOOR = 0xe0d8ce;
const DARK_GRID   = 0x2a2318;
const LIGHT_GRID  = 0xc8bfb4;
const DARK_FOG    = "#111";
const LIGHT_FOG   = "#f0ebe4";

export default function FurnitureView() {
  const { id }      = useParams();
  const mountRef    = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const rafRef      = useRef(null);

  const [item,         setItem]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [modelLoading, setModelLoading] = useState(true);
  const [progress,     setProgress]     = useState(0);
  const [error,        setError]        = useState(null);
  const [bgLight,      setBgLight]      = useState(false); // ← toggle state

  /* ── Toggle background on live scene ── */
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    scene.background = new THREE.Color(bgLight ? LIGHT_BG : DARK_BG);
    scene.fog        = new THREE.Fog(
      bgLight ? LIGHT_FOG : DARK_FOG,
      15, 60
    );

    scene.traverse(obj => {
      if (obj.userData.isGround && obj.isMesh) {
        obj.material.color.set(bgLight ? LIGHT_FLOOR : DARK_FLOOR);
      }
      if (obj.userData.isGrid) {
        const c = bgLight ? LIGHT_GRID : DARK_GRID;
        obj.material.color?.set(c);
        // GridHelper uses two materials (center line + divisions)
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.color?.set(c));
        }
      }
    });
  }, [bgLight]);

  /* ── Fetch furniture data ── */
  useEffect(() => {
    api.get(`furniture/${id}`)
      .catch(() => api.get(`admin/furniture/${id}`))
      .then(r => setItem(r.data))
      .catch(() => setError("Failed to load furniture item."))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Build Three.js scene ── */
  useEffect(() => {
    if (!item || !mountRef.current) return;

    const mount = mountRef.current;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DARK_BG);
    scene.fog        = new THREE.Fog(DARK_FOG, 15, 60);
    sceneRef.current = scene;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* Camera */
    const camera = new THREE.PerspectiveCamera(
      45, mount.clientWidth / mount.clientHeight, 0.1, 200
    );
    camera.position.set(4, 3, 4);

    /* Controls */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance   = 0.5;
    controls.maxDistance   = 30;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0.5, 0);
    controls.update();

    /* Lights */
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near   = 0.1;
    key.shadow.camera.far    = 50;
    key.shadow.camera.left   = key.shadow.camera.bottom = -10;
    key.shadow.camera.right  = key.shadow.camera.top    =  10;
    key.shadow.bias = -0.001;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xc9922a, 0.3);
    fill.position.set(-6, 3, -5);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(0, 6, -8);
    scene.add(rim);

    /* Ground — tagged for recolor */
    const groundMat = new THREE.MeshStandardMaterial({
      color: DARK_FLOOR, roughness: 0.85, metalness: 0.05,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);

    /* Grid — tagged for recolor */
    const grid = new THREE.GridHelper(20, 20, DARK_GRID, DARK_GRID);
    grid.position.y = 0.002;
    grid.userData.isGrid = true;
    scene.add(grid);

    /* Load GLB */
    const glbUrl = item.glbPath
      ? `${BACKEND}${item.glbPath.startsWith("/") ? "" : "/"}${item.glbPath}`
      : null;

    if (!glbUrl) {
      setModelLoading(false);
      const dims = item.dimensions || {};
      const w    = (Number(dims.width)  || 100) / 100;
      const h    = (Number(dims.height) || 90)  / 100;
      const d    = (Number(dims.depth)  || 100) / 100;
      const box  = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 })
      );
      box.position.y = h / 2;
      box.castShadow = true;
      scene.add(box);
      camera.position.set(w * 3, h * 2, d * 3);
      controls.target.set(0, h / 2, 0);
      controls.update();
    } else {
      const loader = new GLTFLoader();
      loader.load(
        glbUrl,
        (gltf) => {
          const model = gltf.scene;
          model.traverse(child => {
            if (child.isMesh) {
              child.castShadow    = true;
              child.receiveShadow = true;
            }
          });

          /* Scale & center */
          const box    = new THREE.Box3().setFromObject(model);
          const size   = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale  = maxDim > 0 ? 2 / maxDim : 1;
          model.scale.setScalar(scale);

          const scaledBox    = new THREE.Box3().setFromObject(model);
          const scaledCenter = new THREE.Vector3();
          const scaledSize   = new THREE.Vector3();
          scaledBox.getCenter(scaledCenter);
          scaledBox.getSize(scaledSize);

          model.position.x = -scaledCenter.x;
          model.position.z = -scaledCenter.z;
          model.position.y = -scaledBox.min.y;
          scene.add(model);

          const dist = Math.max(scaledSize.x, scaledSize.z) * 2.4;
          camera.position.set(dist, scaledSize.y * 1.4, dist);
          controls.target.set(0, scaledSize.y * 0.45, 0);
          controls.update();

          setModelLoading(false);
        },
        (xhr) => {
          if (xhr.total > 0)
            setProgress(Math.round((xhr.loaded / xhr.total) * 100));
        },
        (err) => {
          console.error("GLB load error:", err);
          setError("Failed to load 3D model.");
          setModelLoading(false);
        }
      );
    }

    /* Render loop */
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    /* Resize */
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* Cleanup */
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      sceneRef.current = null;
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [item]);

  /* ── Full-page loading ── */
  if (loading) {
    return (
      <div className="fv-full-state spin">
        <span className="material-icons-round">view_in_ar</span>
        <p>Loading furniture…</p>
      </div>
    );
  }

  /* ── Error state ── */
  if (error && !item) {
    return (
      <div className="fv-full-state">
        <span className="material-icons-round">error_outline</span>
        <p>{error}</p>
        <Link to="/admin/furniture" className="fv-btn-back">
          <span className="material-icons-round">arrow_back</span>
          Back to Inventory
        </Link>
      </div>
    );
  }

  const dims = item?.dimensions || {};

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="fv-shell">

      {/* ── TOP BAR ── */}
      <header className="fv-topbar">
        <Link to="/admin/furniture" className="fv-back">
          <span className="material-icons-round">arrow_back</span>
          Inventory
        </Link>

        <div className="fv-topbar-center">
          <div className="fv-topbar-name">{item?.name || "Unnamed"}</div>
          <div className="fv-topbar-cat">{item?.category}</div>
        </div>

        <div className="fv-topbar-price">
          Rs. {parseFloat(item?.price || 0).toFixed(2)}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="fv-body">

        {/* ── 3D Canvas ── */}
        <div className={`fv-canvas-wrap ${bgLight ? "bg-light" : ""}`}>
          <div ref={mountRef} className="fv-canvas" />

          {/* Loading overlay */}
          {modelLoading && (
            <div className="fv-model-loading">
              <span className="material-icons-round">view_in_ar</span>
              <p>Loading 3D model… {progress}%</p>
              <div className="fv-progress-bar">
                <div className="fv-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* ── Background toggle button ── */}
          {!modelLoading && (
            <button
              className={`fv-bg-toggle ${bgLight ? "light" : "dark"}`}
              title={bgLight ? "Switch to dark background" : "Switch to light background"}
              onClick={() => setBgLight(v => !v)}
            >
              <span className="material-icons-round">
                {bgLight ? "dark_mode" : "light_mode"}
              </span>
              {bgLight ? "Dark" : "Light"}
            </button>
          )}

          {/* Controls hint */}
          {!modelLoading && (
            <div className="fv-hint">
              Drag to rotate · Scroll to zoom · Right-click to pan
            </div>
          )}
        </div>

        {/* ── Info Panel ── */}
        <aside className="fv-info">

          <div className="fv-info-header">
            <div className="fv-info-name">{item?.name}</div>
            {item?.description && (
              <p className="fv-info-desc">{item.description}</p>
            )}
          </div>

          <div className="fv-dims">
            <div className="fv-dims-label">Dimensions</div>
            <div className="fv-dims-row">
              <div className="fv-dim-item">
                <div className="fv-dim-val">{dims.width || 0}</div>
                <div className="fv-dim-key">W cm</div>
              </div>
              <div className="fv-dim-sep">×</div>
              <div className="fv-dim-item">
                <div className="fv-dim-val">{dims.height || 0}</div>
                <div className="fv-dim-key">H cm</div>
              </div>
              <div className="fv-dim-sep">×</div>
              <div className="fv-dim-item">
                <div className="fv-dim-val">{dims.depth || 0}</div>
                <div className="fv-dim-key">D cm</div>
              </div>
            </div>
          </div>

          <div className="fv-info-grid">
            <div className="fv-tile">
              <span className="fv-tile-label">Category</span>
              <span className="fv-tile-value" style={{ textTransform: "capitalize" }}>
                {item?.category || "—"}
              </span>
            </div>
            <div className="fv-tile">
              <span className="fv-tile-label">SKU</span>
              <span className="fv-tile-value">#{item?.sku || "—"}</span>
            </div>
            <div className="fv-tile">
              <span className="fv-tile-label">Price</span>
              <span className="fv-tile-value amber">
                Rs. {parseFloat(item?.price || 0).toFixed(2)}
              </span>
            </div>
            <div className="fv-tile">
              <span className="fv-tile-label">Status</span>
              <span className={`fv-tile-value ${item?.inventoryStatus ? "green" : "red"}`}>
                {item?.inventoryStatus ? "In Stock" : "Out of Stock"}
              </span>
            </div>
          </div>

          {item?.glbPath && (
            <div className="fv-model-chip">
              <div className="fv-model-icon">
                <span className="material-icons-round">view_in_ar</span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fv-text)" }}>3D Model</div>
                <div className="fv-model-file">{item.glbPath.split("/").pop()}</div>
              </div>
              <span className="fv-model-badge">GLB</span>
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}