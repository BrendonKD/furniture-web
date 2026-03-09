import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as THREE from "three";
// ✅ three/addons works with Three.js r152+; fall back to examples/jsm if you get a module error
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import api from "../api/axiosInstance";
import "./FurnitureView.css";

const FurnitureView = () => {
  const { id } = useParams();
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(null);

  // 1. Fetch furniture data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        // Try public endpoint first, fall back to admin
        const res = await api.get(`furniture/${id}`).catch(() => api.get(`admin/furniture/${id}`));
        setItem(res.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load furniture item.");
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  // 2. Initialize Three.js scene once item is loaded
  useEffect(() => {
    if (!item || !mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3, 2, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;        // ✅ PCFSoftShadowMap deprecated
    renderer.outputColorSpace = THREE.SRGBColorSpace;    // ✅ outputEncoding removed in r152
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xd97706, 0.3);
    fillLight.position.set(-5, 2, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0.5, 0);
    controls.update();

    // Load GLB
    // ✅ FIX: glbPath in DB is "/uploads/file.glb" — prepend backend origin
    const glbUrl = `http://localhost:5000${item.glbPath}`;
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;

        model.scale.setScalar(scale);
        // ✅ Re-center after scaling: subtract scaled center so model sits at origin
        model.position.copy(center.clone().multiplyScalar(-scale));
        model.position.y = 0;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);

        // ✅ Use scaled size for camera distance so it always frames the model correctly
        const scaledSize = size.clone().multiplyScalar(scale);
        const scaledMax = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
        camera.position.set(scaledMax * 2, scaledMax * 1.5, scaledMax * 2);
        controls.target.set(0, scaledSize.y / 2, 0);
        controls.update();

        setModelLoading(false);
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      (err) => {
        console.error("GLB load error:", err);
        setError("Failed to load 3D model.");
        setModelLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [item]);

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-full">
          <span className="material-icons-round spinning">view_in_ar</span>
          <p>Loading furniture...</p>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="view-container">
        <div className="error-full">
          <span className="material-icons-round">error</span>
          <p>{error}</p>
          <Link to="/" className="btn-back">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      {/* Top Bar */}
      <div className="view-topbar">
        <Link to="/" className="back-link">
          <span className="material-icons-round">arrow_back</span>
          Back
        </Link>
        {item && (
          <div className="topbar-info">
            <h2>{item.name}</h2>
            <span className="topbar-cat">{item.category}</span>
          </div>
        )}
        {item && (
          <div className="topbar-price">${parseFloat(item.price).toFixed(2)}</div>
        )}
      </div>

      {/* Viewer */}
      <div className="viewer-wrapper">
        {/* Three.js canvas mount */}
        <div ref={mountRef} className="three-canvas" />

        {/* Loading overlay */}
        {modelLoading && (
          <div className="model-loading-overlay">
            <span className="material-icons-round spinning">view_in_ar</span>
            <p>Loading 3D model... {loadProgress}%</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${loadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Controls hint */}
        {!modelLoading && (
          <div className="controls-hint">
            <span>🖱 Drag to rotate · Scroll to zoom · Right-click to pan</span>
          </div>
        )}
      </div>

      {/* Info Panel */}
      {item && (
        <div className="info-panel">
          <div className="info-section">
            <h3>{item.name}</h3>
            {item.description && <p className="description">{item.description}</p>}
          </div>

          <div className="info-grid">
            <div className="info-tile">
              <span className="tile-label">Category</span>
              <span className="tile-value">{item.category}</span>
            </div>
            <div className="info-tile">
              <span className="tile-label">SKU</span>
              <span className="tile-value">#{item.sku || "—"}</span>
            </div>
            <div className="info-tile">
              <span className="tile-label">Price</span>
              <span className="tile-value price-value">
                ${parseFloat(item.price).toFixed(2)}
              </span>
            </div>
            <div className="info-tile">
              <span className="tile-label">Status</span>
              <span className={`tile-value ${item.inventoryStatus ? "instock" : "outstock"}`}>
                {item.inventoryStatus ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            <div className="info-tile full-width">
              <span className="tile-label">Dimensions</span>
              <span className="tile-value">
                {item.dimensions?.width || 0} × {item.dimensions?.height || 0} × {item.dimensions?.depth || 0} cm
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FurnitureView;