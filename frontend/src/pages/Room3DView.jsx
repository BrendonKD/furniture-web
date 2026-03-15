import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./Room3DView.css";

const API_BASE       = "http://localhost:5000/api";
const BACKEND_ORIGIN = "http://localhost:5000";

/* ═══════════════════════════════════════════════════════
   Page — data fetching + UI
═══════════════════════════════════════════════════════ */
export default function Room3DView() {
  const [searchParams] = useSearchParams();
  const designId = searchParams.get("designId");

  const [loading,     setLoading]     = useState(true);
  const [design,      setDesign]      = useState(null);
  const [catalog,     setCatalog]     = useState([]);
  const [error,       setError]       = useState("");
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    if (!designId) { setError("Missing designId."); setLoading(false); return; }
    (async () => {
      try {
        const [dr, fr] = await Promise.all([
          fetch(`${API_BASE}/designs/public/${designId}`),
          fetch(`${API_BASE}/furniture`),
        ]);
        if (!dr.ok) throw new Error(`Design load failed (${dr.status})`);
        if (!fr.ok) throw new Error(`Furniture load failed (${fr.status})`);
        setDesign(await dr.json());
        const fd = await fr.json();
        setCatalog(Array.isArray(fd) ? fd : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [designId]);

  const furnitureMap = useMemo(() => {
    const m = new Map();
    catalog.forEach(c => m.set(String(c._id), c));
    return m;
  }, [catalog]);

  const room = useMemo(() => ({
    length:     Number(design?.room?.length)     || 10,
    width:      Number(design?.room?.width)      || 8,
    height:     Number(design?.room?.height)     || 3,
    wallColor:  design?.room?.wallColor          || "#c8b8a2",
    floorColor: design?.room?.floorColor         || "#8d6e63",
  }), [design]);

  const items = useMemo(
    () => Array.isArray(design?.furniture) ? design.furniture : [],
    [design]
  );

  if (loading) return (
    <div className="r3d-shell">
      <div className="r3d-loading">
        <div className="r3d-spinner" />
        <span>Loading 3D room…</span>
      </div>
    </div>
  );

  if (error || !design) return (
    <div className="r3d-shell">
      <header className="r3d-header">
        <div className="r3d-header-left">
          <span className="r3d-logo">⬡</span>
          <span className="r3d-title">3D Room View</span>
        </div>
        <Link to="/admin/create-session" className="r3d-btn r3d-btn-outline">← Back</Link>
      </header>
      <div className="r3d-error">{error || "Design not found."}</div>
    </div>
  );

  return (
    <div className="r3d-shell">

      <header className="r3d-header">
        <div className="r3d-header-left">
          <span className="r3d-logo">⬡</span>
          <div>
            <div className="r3d-title">{design.name || "Untitled Design"}</div>
            <div className="r3d-subtitle">
              {design.roomType || "Room"}&ensp;·&ensp;
              {room.length}m × {room.width}m × {room.height}m
            </div>
          </div>
        </div>
        <div className="r3d-header-right">
          <Link to={`/admin/create-session?designId=${design._id}`} className="r3d-btn r3d-btn-outline">
            ← 2D Designer
          </Link>
          <Link to="/admin" className="r3d-btn r3d-btn-accent">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="r3d-body">

        <div className="r3d-canvas-wrap">
          <ThreeCanvas room={room} items={items} furnitureMap={furnitureMap} />
          <div className="r3d-canvas-badge">3D VIEW</div>
          <div className="r3d-canvas-hint">Drag to orbit · Scroll to zoom · Right-click to pan</div>
        </div>

        <aside className="r3d-panel">

          <section className="r3d-section">
            <div className="r3d-section-label">Room</div>
            <div className="r3d-stat-grid">
              <StatCard label="Length" value={`${room.length}m`} />
              <StatCard label="Width"  value={`${room.width}m`} />
              <StatCard label="Height" value={`${room.height}m`} />
              <StatCard label="Items"  value={items.length} accent />
            </div>
            <div className="r3d-chips">
              <ColorChip color={room.wallColor}  label="Wall" />
              <ColorChip color={room.floorColor} label="Floor" />
            </div>
          </section>

          <section className="r3d-section r3d-section-scroll">
            <div className="r3d-section-label">
              Furniture <span className="r3d-count">{items.length}</span>
            </div>
            {items.length === 0
              ? <div className="r3d-empty"><span>◫</span>No furniture placed</div>
              : (
                <div className="r3d-flist">
                  {items.map((item, i) => {
                    const ci     = furnitureMap.get(String(item.furnitureId));
                    const active = selectedIdx === i;
                    return (
                      <button
                        key={i}
                        className={`r3d-frow${active ? " active" : ""}`}
                        onClick={() => setSelectedIdx(active ? null : i)}
                      >
                        <span className="r3d-ficon">
                          {(ci?.name || "F")[0].toUpperCase()}
                        </span>
                        <div className="r3d-finfo">
                          <div className="r3d-fname">{ci?.name || item.type || "Furniture"}</div>
                          <div className="r3d-fmeta">
                            {ci?.category || "—"}
                            {ci?.dimensions ? ` · ${ci.dimensions.width}×${ci.dimensions.depth}cm` : ""}
                          </div>
                        </div>
                        <div className="r3d-fpos">
                          <span>{Number(item.x).toFixed(1)}m</span>
                          <span className="dim">x · y</span>
                          <span>{Number(item.y).toFixed(1)}m</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            }
          </section>

          {selectedIdx != null && items[selectedIdx] && (() => {
            const it = items[selectedIdx];
            const ci = furnitureMap.get(String(it.furnitureId));
            return (
              <section className="r3d-section">
                <div className="r3d-section-label">Selected</div>
                <div className="r3d-inspector">
                  <div className="r3d-inspector-name">{ci?.name || it.type || "Furniture"}</div>
                  <div className="r3d-inspector-grid">
                    <DItem label="Pos X"    value={`${Number(it.x).toFixed(2)}m`} />
                    <DItem label="Pos Y"    value={`${Number(it.y).toFixed(2)}m`} />
                    <DItem label="Rotation" value={`${it.rotation || 0}°`} />
                    <DItem label="Scale"    value={`${it.scale || 1}×`} />
                  </div>
                  {ci?.glbPath && <div className="r3d-glbpath">{ci.glbPath}</div>}
                </div>
              </section>
            );
          })()}

        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ThreeCanvas — vanilla Three.js (no R3F/drei)

   Uses the exact same proven technique from Room3DCanvas:
     1. Load GLB with GLTFLoader
     2. Scale model to fit DB dimensions
     3. Measure bbox AFTER scaling
     4. model.position.y = -scaledBbox.min.y  ← floor snap
     5. model.position.x/z centred on item.x/y

   This is version-independent and always works because
   requestAnimationFrame guarantees matrices are computed
   before we measure them.
═══════════════════════════════════════════════════════ */
function ThreeCanvas({ room, items, furnitureMap }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const L = room.length;
    const W = room.width;
    const H = room.height;

    /* ── Scene setup ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b0d10");
    scene.fog = new THREE.Fog("#0b0d10", L * 4, L * 12);

    const W_px = el.clientWidth  || 800;
    const H_px = el.clientHeight || 600;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W_px, H_px);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.innerHTML = "";
    el.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("webglcontextlost", e => e.preventDefault());

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(50, W_px / H_px, 0.1, 500);
    camera.position.set(L * 0.6, H * 2.2, W * 2.2);

    /* ── Controls ── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.07;
    controls.target.set(L / 2, H * 0.25, W / 2);
    controls.minDistance    = 2;
    controls.maxDistance    = 80;
    controls.maxPolarAngle  = Math.PI / 2.05;

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(L * 0.8, H * 3, W * 0.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left   = -30;
    sun.shadow.camera.right  =  30;
    sun.shadow.camera.top    =  30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.far    = 100;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const fill = new THREE.PointLight(0xffe8c0, 0.4, L * 2);
    fill.position.set(L / 2, H * 0.8, W / 2);
    scene.add(fill);

    /* ── Room geometry ── */
    const T = 0.1;
    const wallMat  = new THREE.MeshStandardMaterial({ color: room.wallColor,  roughness: 0.85 });
    const floorMat = new THREE.MeshStandardMaterial({ color: room.floorColor, roughness: 0.88, metalness: 0.04 });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, W), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(L / 2, 0, W / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall z=0
    const bw = new THREE.Mesh(new THREE.BoxGeometry(L + T * 2, H, T), wallMat);
    bw.position.set(L / 2, H / 2, 0);
    bw.castShadow = bw.receiveShadow = true;
    scene.add(bw);

    // Left wall x=0
    const lw = new THREE.Mesh(new THREE.BoxGeometry(T, H, W), wallMat);
    lw.position.set(0, H / 2, W / 2);
    lw.castShadow = lw.receiveShadow = true;
    scene.add(lw);

    // Right wall x=L
    const rw = new THREE.Mesh(new THREE.BoxGeometry(T, H, W), wallMat);
    rw.position.set(L, H / 2, W / 2);
    rw.castShadow = rw.receiveShadow = true;
    scene.add(rw);

    // Grid
    const grid = new THREE.GridHelper(Math.max(L, W) * 2.5, Math.max(L, W) * 2.5, "#222", "#1a1a1a");
    grid.position.set(L / 2, 0.002, W / 2);
    scene.add(grid);

    /* ── Furniture ── */
    const loader = new GLTFLoader();

    const loadFurniture = async () => {
      for (const item of items) {
        const ci  = furnitureMap.get(String(item.furnitureId));
        const url = ci?.glbPath ? resolveGlbPath(ci.glbPath) : null;

        /* Target real-world size in metres from DB (stored as cm) */
        const dbW_m = (Number(ci?.dimensions?.width)  || 100) / 100;
        const dbH_m = (Number(ci?.dimensions?.height) || 90)  / 100;
        const dbD_m = (Number(ci?.dimensions?.depth)  || 100) / 100;
        const userScale = Number(item.scale) || 1;

        /* X/Z world position from design data */
        const posX = Number(item.x) || 0;
        const posZ = Number(item.y) || 0;
        const rotY = THREE.MathUtils.degToRad(Number(item.rotation) || 0);

        if (!url) {
          addFallbackBox(scene, posX, posZ, rotY, dbW_m, dbH_m, dbD_m, userScale, ci);
          continue;
        }

        try {
          const gltf  = await loadGLTF(loader, url);
          const model = gltf.scene;

          /* Shadows */
          model.traverse(child => {
            if (child.isMesh) child.castShadow = child.receiveShadow = true;
          });

          /*
           * Placement algorithm (same as friend's working Room3DCanvas):
           *
           * 1. Add model to a temporary pivot group so Three.js computes
           *    all matrixWorld values correctly before we measure.
           * 2. Apply scale + rotation FIRST.
           * 3. Force matrix update so Box3 gets accurate world coords.
           * 4. Measure bbox → compute scale → snap to floor.
           *
           * Key: updateMatrixWorld(true) on the group before measuring
           * guarantees correct results regardless of GLB authoring style.
           */

          // Step 1: Put model in a container group at world origin
          const pivot = new THREE.Group();
          pivot.add(model);
          scene.add(pivot);  // must be in scene for matrixWorld to compute

          // Step 2: measure raw size with model at identity transform
          model.rotation.set(0, 0, 0);
          model.position.set(0, 0, 0);
          model.scale.set(1, 1, 1);
          pivot.updateMatrixWorld(true);

          const rawBox  = new THREE.Box3().setFromObject(pivot);
          const rawSize = new THREE.Vector3();
          rawBox.getSize(rawSize);

          // Step 3: compute uniform scale to fit DB dimensions
          let s = userScale;
          if (rawSize.x > 1e-5 && rawSize.y > 1e-5 && rawSize.z > 1e-5) {
            s = Math.min(dbW_m / rawSize.x, dbH_m / rawSize.y, dbD_m / rawSize.z) * userScale;
          }
          model.scale.setScalar(s);

          // Step 4: apply rotation BEFORE measuring final bbox
          model.rotation.y = rotY;
          pivot.updateMatrixWorld(true);

          // Step 5: measure bbox AFTER scale + rotation
          const scaledBox    = new THREE.Box3().setFromObject(pivot);
          const scaledCenter = new THREE.Vector3();
          scaledBox.getCenter(scaledCenter);

          // Step 6: position — centre on posX/posZ, snap bottom to floor y=0
          pivot.position.x = posX - scaledCenter.x;
          pivot.position.z = posZ - scaledCenter.z;
          pivot.position.y = -scaledBox.min.y;

        } catch (err) {
          console.warn(`GLB failed (${ci?.name}):`, err.message);
          addFallbackBox(scene, posX, posZ, rotY, dbW_m, dbH_m, dbD_m, userScale, ci);
        }
      }
    };

    loadFurniture();

    /* ── Render loop ── */
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    /* ── Resize ── */
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };

  }, [room, items, furnitureMap]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}

/* ── Helpers ── */

function loadGLTF(loader, url) {
  return new Promise((resolve, reject) =>
    loader.load(url, resolve, undefined, reject)
  );
}

function addFallbackBox(scene, posX, posZ, rotY, w, h, d, scale, ci) {
  const fw = w * scale, fh = h * scale, fd = d * scale;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(fw, fh, fd),
    new THREE.MeshStandardMaterial({
      color: categoryColor(ci?.category || ""),
      roughness: 0.75,
      metalness: 0.1,
    })
  );
  box.position.set(posX, fh / 2, posZ);
  box.rotation.y = rotY;
  box.castShadow = box.receiveShadow = true;
  scene.add(box);
}

function resolveGlbPath(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function categoryColor(cat) {
  const k = String(cat).toLowerCase();
  if (k.includes("sofa"))  return "#8d6e63";
  if (k.includes("chair")) return "#a1887f";
  if (k.includes("table")) return "#6d4c41";
  if (k.includes("bed"))   return "#7e57c2";
  if (k.includes("shelf")) return "#5d7a6e";
  return "#9e9e9e";
}

/* ── UI sub-components ── */
function StatCard({ label, value, accent }) {
  return (
    <div className={`r3d-stat${accent ? " accent" : ""}`}>
      <div className="val">{value}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}
function ColorChip({ color, label }) {
  return (
    <span className="r3d-chip">
      <span className="dot" style={{ background: color }} />
      {label}
    </span>
  );
}
function DItem({ label, value }) {
  return (
    <div className="r3d-ditem">
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </div>
  );
}