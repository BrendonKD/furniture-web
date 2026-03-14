import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import "./Room3DView.css";

const API_BASE      = "http://localhost:5000/api";
const BACKEND_ORIGIN = "http://localhost:5000";

/* ═══════════════════════════════════════════════════════
   Page
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

  /* ── Loading ── */
  if (loading) return (
    <div className="r3d-shell">
      <div className="r3d-loading">
        <div className="r3d-spinner" />
        <span>Loading 3D room…</span>
      </div>
    </div>
  );

  /* ── Error ── */
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

  /* ── View ── */
  return (
    <div className="r3d-shell">

      {/* ── Header ── */}
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

      {/* ── Body ── */}
      <div className="r3d-body">

        {/* 3D canvas — takes all remaining width */}
        <div className="r3d-canvas-wrap">
          <Canvas
            shadows
            gl={{ antialias: true, alpha: false }}
            camera={{
              position: [room.length * 0.6, room.height * 2.2, room.width * 2.2],
              fov: 50,
              near: 0.1,
              far: 500,
            }}
          >
            <Scene
              room={room}
              items={items}
              furnitureMap={furnitureMap}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
            />
          </Canvas>
          <div className="r3d-canvas-badge">3D VIEW</div>
          <div className="r3d-canvas-hint">Drag to orbit · Scroll to zoom · Right-click to pan</div>
        </div>

        {/* Right panel */}
        <aside className="r3d-panel">

          {/* Room stats */}
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

          {/* Furniture list */}
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

          {/* Selected item inspector */}
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
   Three.js Scene
═══════════════════════════════════════════════════════ */
function Scene({ room, items, furnitureMap, selectedIdx, onSelect }) {
  /* Camera target = centre of room, slightly elevated */
  const cx = room.length / 2;
  const cz = room.width  / 2;

  return (
    <>
      <color attach="background" args={["#0b0d10"]} />

      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        intensity={1.5}
        position={[room.length * 0.8, room.height * 3, room.width * 0.6]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={100}
        shadow-bias={-0.0005}
      />
      <pointLight
        position={[cx, room.height * 0.8, cz]}
        intensity={0.4}
        color="#ffe8c0"
        distance={room.length * 2}
      />

      {/* Room shell — walls + floor, origin at corner (0,0,0) */}
      <RoomShell room={room} />

      {/* Furniture */}
      <Suspense fallback={null}>
        {items.map((item, i) => (
          <FurnitureItem
            key={i}
            item={item}
            catalogItem={furnitureMap.get(String(item.furnitureId))}
            isSelected={selectedIdx === i}
            onClick={() => onSelect(selectedIdx === i ? null : i)}
          />
        ))}
      </Suspense>

      {/* Grid helper centred on room */}
      <gridHelper
        args={[
          Math.max(room.length, room.width) * 2.5,
          Math.max(room.length, room.width) * 2.5,
          "#222",
          "#1a1a1a",
        ]}
        position={[cx, 0.002, cz]}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.07}
        minDistance={2}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.05}
        target={[cx, room.height * 0.25, cz]}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   Room geometry
   Origin at corner (0, 0, 0).
   X spans 0 → room.length
   Z spans 0 → room.width
   Y spans 0 → room.height  (floor at y=0)
═══════════════════════════════════════════════════════ */
function RoomShell({ room }) {
  const T  = 0.1;
  const L  = room.length;
  const W  = room.width;
  const H  = room.height;
  const wc = room.wallColor;
  const fc = room.floorColor;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 2, 0, W / 2]} receiveShadow>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color={fc} roughness={0.88} metalness={0.04} />
      </mesh>

      {/* Back wall — z = 0 */}
      <mesh position={[L / 2, H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[L + T * 2, H, T]} />
        <meshStandardMaterial color={wc} roughness={0.85} />
      </mesh>

      {/* Left wall — x = 0 */}
      <mesh position={[0, H / 2, W / 2]} receiveShadow castShadow>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color={wc} roughness={0.85} />
      </mesh>

      {/* Right wall — x = L */}
      <mesh position={[L, H / 2, W / 2]} receiveShadow castShadow>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color={wc} roughness={0.85} />
      </mesh>

      {/* Skirting board along back wall */}
      <mesh position={[L / 2, 0.04, T / 2]} receiveShadow>
        <boxGeometry args={[L, 0.08, 0.04]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   Furniture item dispatcher
═══════════════════════════════════════════════════════ */
function FurnitureItem({ item, catalogItem, isSelected, onClick }) {
  const glbPath = resolveGlbPath(catalogItem?.glbPath);
  const fallback = <FallbackBox item={item} catalogItem={catalogItem} isSelected={isSelected} onClick={onClick} />;

  if (!glbPath) return fallback;

  return (
    <Suspense fallback={fallback}>
      <GLBModel item={item} catalogItem={catalogItem} glbPath={glbPath} isSelected={isSelected} onClick={onClick} />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════
   GLB model — definitive floor placement

   Root cause of all previous failures:
   GLB/GLTF files bake the authoring transform into the
   root node (position, rotation, scale). When we clone
   and measure, those baked transforms throw off both the
   size measurement AND the floor-lift calculation.

   Fix: strip every node's local transform to identity,
   then measure pure geometry, then scale to DB size,
   then lift so bbox.min.y == 0 in world space.
═══════════════════════════════════════════════════════ */
function GLBModel({ item, catalogItem, glbPath, isSelected, onClick }) {
  const { scene } = useGLTF(glbPath);

  /* DB dimensions: stored as centimetres, convert to metres */
  const dbW = (Number(catalogItem?.dimensions?.width)  || 100) / 100;
  const dbH = (Number(catalogItem?.dimensions?.height) || 90)  / 100;
  const dbD = (Number(catalogItem?.dimensions?.depth)  || 100) / 100;
  const userScale = Number(item.scale) || 1;

  /* ── Compute scale and floor offset from raw geometry ── */
  const { uniformScale, liftY } = useMemo(() => {

    /* 1. Clone the scene and STRIP every node transform to identity.
          This removes ALL baked-in authoring offsets so we measure
          only the raw vertex positions as the author drew them. */
    const stripped = scene.clone(true);
    stripped.traverse(node => {
      node.position.set(0, 0, 0);
      node.rotation.set(0, 0, 0);
      node.scale.set(1, 1, 1);
      node.updateMatrix();
    });
    stripped.updateMatrixWorld(true);

    /* 2. Measure bounding box of the stripped scene */
    const box  = new THREE.Box3().setFromObject(stripped);
    const size = new THREE.Vector3();
    box.getSize(size);

    /* 3. Guard: empty scene */
    if (size.length() < 1e-6) {
      return { uniformScale: userScale, liftY: dbH / 2 };
    }

    /* 4. Auto-detect unit system.
          GLTF spec mandates metres. A 90cm-tall sofa = 0.9 units.
          If the largest dimension > 10, file is almost surely in cm. */
    const biggestAxis = Math.max(size.x, size.y, size.z);
    const toMetres    = biggestAxis > 10 ? 0.01 : 1;

    const mW = size.x * toMetres;   /* model width  in metres */
    const mH = size.y * toMetres;   /* model height in metres */
    const mD = size.z * toMetres;   /* model depth  in metres */

    /* 5. Uniform scale: fit the model inside the DB envelope */
    const s = Math.min(dbW / mW, dbH / mH, dbD / mD) * userScale;

    /* 6. Final uniform scale (includes cm→m conversion) */
    const finalScale = s * toMetres;

    /* 7. Floor lift:
          box.min.y is in stripped-geometry units.
          After finalScale is applied: world_bottom = box.min.y * finalScale
          We lift the group by  -box.min.y * finalScale  so bottom = 0. */
    const lift = -(box.min.y * finalScale);

    return { uniformScale: finalScale, liftY: lift };

  }, [scene, dbW, dbH, dbD, userScale]);

  /* ── Clone for rendering (separate from the measurement clone) ── */
  const renderClone = useMemo(() => clone(scene), [scene]);

  useEffect(() => {
    renderClone.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
  }, [renderClone]);

  const px   = Number(item.x) || 0;
  const pz   = Number(item.y) || 0;
  const rotY = THREE.MathUtils.degToRad(Number(item.rotation) || 0);

  return (
    <group
      position={[px, liftY, pz]}
      rotation={[0, rotY, 0]}
      scale={[uniformScale, uniformScale, uniformScale]}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <primitive object={renderClone} />
      {isSelected && <SelectionRing w={dbW} d={dbD} s={uniformScale} />}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   Fallback coloured box (when no GLB)
   Positioned so y=0 is the floor: group.y = h/2
═══════════════════════════════════════════════════════ */
function FallbackBox({ item, catalogItem, isSelected, onClick }) {
  const scale = Number(item.scale) || 1;
  const w = (Number(catalogItem?.dimensions?.width)  || 100) / 100 * scale;
  const h = (Number(catalogItem?.dimensions?.height) || 90)  / 100 * scale;
  const d = (Number(catalogItem?.dimensions?.depth)  || 100) / 100 * scale;

  const px   = Number(item.x) || 0;
  const pz   = Number(item.y) || 0;
  const rotY = THREE.MathUtils.degToRad(Number(item.rotation) || 0);
  const col  = categoryColor(catalogItem?.category || item.type || "");

  return (
    <group
      position={[px, h / 2, pz]}
      rotation={[0, rotY, 0]}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={isSelected ? "#e3b566" : col}
          roughness={0.75}
          metalness={0.1}
          emissive={isSelected ? new THREE.Color(0.1, 0.07, 0) : new THREE.Color(0, 0, 0)}
        />
      </mesh>
      {isSelected && <SelectionRing w={w} d={d} />}
    </group>
  );
}

/* Animated selection ring — drawn in model-local units (parent has scale=s applied) */
function SelectionRing({ w, d, s = 1 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.material.opacity = 0.4 + 0.45 * Math.sin(clock.elapsedTime * 3);
  });
  /*
   * w/d are real-world metres (DB dimensions).
   * This mesh lives inside a group with scale=s, so divide by s
   * to get the correct size in model-local units.
   */
  const r  = Math.max(w, d) * 0.6 / s;
  const r2 = r * 1.18;
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03 / s, 0]}>
      <ringGeometry args={[r, r2, 48]} />
      <meshBasicMaterial color="#e3b566" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════
   UI sub-components
═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════ */
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