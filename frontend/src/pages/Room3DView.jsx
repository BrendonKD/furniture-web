import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

const API_BASE = "http://localhost:5000/api";

export default function Room3DView() {
  const [searchParams] = useSearchParams();
  const designId = searchParams.get("designId");

  const [loading, setLoading] = useState(true);
  const [design, setDesign] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      if (!designId) {
        setError("Missing designId in URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [designRes, furnitureRes] = await Promise.all([
          fetch(`${API_BASE}/designs/public/${designId}`),
          fetch(`${API_BASE}/furniture`),
        ]);

        if (!designRes.ok) {
          throw new Error(`Failed to load design (${designRes.status})`);
        }

        if (!furnitureRes.ok) {
          throw new Error(`Failed to load furniture catalog (${furnitureRes.status})`);
        }

        const designData = await designRes.json();
        const furnitureData = await furnitureRes.json();

        setDesign(designData);
        setCatalog(Array.isArray(furnitureData) ? furnitureData : []);
      } catch (err) {
        console.error("3D room load failed:", err);
        setError(err.message || "Failed to load 3D room.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [designId]);

  const furnitureMap = useMemo(() => {
    const map = new Map();
    catalog.forEach((item) => map.set(String(item._id), item));
    return map;
  }, [catalog]);

  const room = useMemo(() => {
    return {
      length: Number(design?.room?.length) || 10,
      width: Number(design?.room?.width) || 8,
      height: Number(design?.room?.height) || 3,
      wallColor: design?.room?.wallColor || "#d8d2cf",
      floorColor: design?.room?.floorColor || "#8d6e63",
    };
  }, [design]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>Loading 3D room...</div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>3D Room View</h2>
          </div>
          <div style={actionsStyle}>
            <Link to="/admin/create-session" className="btn btn-outline-light btn-sm">
              Back to designer
            </Link>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div className="alert alert-danger">{error || "Design not found."}</div>
        </div>
      </div>
    );
  }

  const items = Array.isArray(design.furniture) ? design.furniture : [];

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
            {design.name || "Untitled Design"}
          </h1>
          <div style={{ color: "#9ca3af", marginTop: 4 }}>
            {design.roomType || "Room"} · {room.length}m × {room.width}m × {room.height}m
          </div>
        </div>

        <div style={actionsStyle}>
          <Link
            to={`/admin/create-session?designId=${design._id}`}
            className="btn btn-outline-light btn-sm"
          >
            Back to 2D Designer
          </Link>
          <Link to="/admin" className="btn btn-warning btn-sm">
            Dashboard
          </Link>
        </div>
      </div>

      <div style={contentStyle}>
        <div style={canvasWrapStyle}>
          <Canvas
            shadows
            camera={{
              position: [room.length * 0.8, room.height * 1.2, room.width * 1.05],
              fov: 50,
            }}
          >
            <color attach="background" args={["#0b0d10"]} />
            <ambientLight intensity={0.9} />
            <directionalLight
              castShadow
              intensity={1.3}
              position={[10, 12, 8]}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <pointLight position={[0, room.height - 0.2, 0]} intensity={0.4} />

            <Suspense fallback={null}>
              <RoomShell room={room} />
              <FurnitureObjects items={items} furnitureMap={furnitureMap} room={room} />
            </Suspense>

            <Grid
              position={[0, 0.005, 0]}
              args={[Math.max(room.length * 2, 30), Math.max(room.width * 2, 30)]}
              cellSize={1}
              sectionSize={5}
              fadeDistance={60}
              fadeStrength={1}
              cellThickness={0.5}
              sectionThickness={1}
              cellColor="#3d3d3d"
              sectionColor="#5a5a5a"
            />

            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              minDistance={4}
              maxDistance={40}
              maxPolarAngle={Math.PI / 2.05}
              target={[0, 1, 0]}
            />
          </Canvas>
        </div>

        <div style={sidePanelStyle}>
          <div style={panelCardStyle}>
            <div style={panelTitleStyle}>Furniture in room</div>

            {items.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 14 }}>No furniture placed.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((item, index) => {
                  const found = furnitureMap.get(String(item.furnitureId));
                  return (
                    <div key={`${item.furnitureId}-${index}`} style={listRowStyle}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {found?.name || item.type || "Furniture"}
                        </div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          {found?.glbPath || "No GLB path"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomShell({ room }) {
  const wallThickness = 0.12;
  const wallHeight = room.height;
  const wallColor = new THREE.Color(room.wallColor);
  const floorColor = new THREE.Color(room.floorColor);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.length, room.width]} />
        <meshStandardMaterial color={floorColor} roughness={0.95} metalness={0.02} />
      </mesh>

      <mesh position={[0, wallHeight / 2, -room.width / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.length, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      <mesh position={[0, wallHeight / 2, room.width / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.length, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      <mesh position={[-room.length / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, room.width]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      <mesh position={[room.length / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, room.width]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
    </group>
  );
}

function FurnitureObjects({ items, furnitureMap, room }) {
  return (
    <group>
      {items.map((item, index) => {
        const catalogItem = furnitureMap.get(String(item.furnitureId));
        return (
          <FurnitureModel
            key={`${item.furnitureId}-${index}`}
            item={item}
            catalogItem={catalogItem}
            room={room}
          />
        );
      })}
    </group>
  );
}

function FurnitureModel({ item, catalogItem, room }) {
  const glbPath = normalizeGlbPath(catalogItem?.glbPath);

  if (!glbPath) {
    return <FurnitureFallback item={item} catalogItem={catalogItem} room={room} />;
  }

  return (
    <Suspense fallback={<FurnitureFallback item={item} catalogItem={catalogItem} room={room} />}>
      <LoadedGLB item={item} catalogItem={catalogItem} room={room} glbPath={glbPath} />
    </Suspense>
  );
}

function LoadedGLB({ item, catalogItem, room, glbPath }) {
    const { scene } = useGLTF(glbPath);
    const clonedScene = useMemo(() => clone(scene), [scene]);

    const dims = getFurnitureDimensionsInMetres(catalogItem);
    const scaleValue = Number(item.scale) || 1;
    const rotationY = THREE.MathUtils.degToRad(Number(item.rotation) || 0);

    const x = (Number(item.x) || 0) - room.length / 2;
    const z = room.width / 2 - (Number(item.y) || 0);
    const y = (dims.height * scaleValue) / 2;

  const bbox = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }, [clonedScene]);

  const normalizedScale = useMemo(() => {
    const sx = dims.width / Math.max(bbox.x || 1, 0.001);
    const sy = dims.height / Math.max(bbox.y || 1, 0.001);
    const sz = dims.depth / Math.max(bbox.z || 1, 0.001);
    return Math.min(sx, sy, sz) * scaleValue;
  }, [bbox.x, bbox.y, bbox.z, dims.width, dims.height, dims.depth, scaleValue]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return (
    <group
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      scale={[normalizedScale, normalizedScale, normalizedScale]}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

function FurnitureFallback({ item, catalogItem, room }) {
  const dims = getFurnitureDimensionsInMetres(catalogItem);
  const scaleValue = Number(item.scale) || 1;

  const itemWidth = dims.width * scaleValue;
  const itemDepth = dims.depth * scaleValue;
  const itemHeight = dims.height * scaleValue;

    const x = (Number(item.x) || 0) - room.length / 2;
    const z = room.width / 2 - (Number(item.y) || 0);
    const y = itemHeight / 2;

  const rotationY = THREE.MathUtils.degToRad(Number(item.rotation) || 0);
  const color = getFurnitureColor(catalogItem?.category || item.type);

  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[itemWidth, itemHeight, itemDepth]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.08} />
      </mesh>
    </group>
  );
}

function getFurnitureDimensionsInMetres(catalogItem) {
  const rawWidth = Number(catalogItem?.dimensions?.width) || 100;
  const rawHeight = Number(catalogItem?.dimensions?.height) || 90;
  const rawDepth = Number(catalogItem?.dimensions?.depth) || 100;

  return {
    width: rawWidth / 100,
    height: rawHeight / 100,
    depth: rawDepth / 100,
  };
}

const BACKEND_ORIGIN = "http://localhost:5000";

function normalizeGlbPath(path) {
  if (!path) return "";

  // Already full URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // DB value: "/uploads/1771949508585-chair.glb"
  if (path.startsWith("/uploads/")) {
    return `${BACKEND_ORIGIN}${path}`;
  }

  // Just in case: "uploads/..."
  if (path.startsWith("uploads/")) {
    return `${BACKEND_ORIGIN}/${path}`;
  }

  // Any other absolute path
  if (path.startsWith("/")) {
    return `${BACKEND_ORIGIN}${path}`;
  }

  // Fallback
  return `${BACKEND_ORIGIN}/${path}`;
}



function getFurnitureColor(category = "") {
  const key = String(category).toLowerCase();
  if (key.includes("sofa")) return "#8d6e63";
  if (key.includes("chair")) return "#a1887f";
  if (key.includes("table")) return "#6d4c41";
  if (key.includes("bed")) return "#7e57c2";
  return "#9e9e9e";
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0a0a0a",
  color: "#fff",
};

const centerStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "20px 24px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "#0a0a0a",
};

const actionsStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const contentStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 320px",
  minHeight: "calc(100vh - 81px)",
};

const canvasWrapStyle = {
  minHeight: "calc(100vh - 81px)",
  background: "#0b0d10",
};

const sidePanelStyle = {
  borderLeft: "1px solid rgba(255,255,255,0.08)",
  padding: 16,
  background: "#0f1115",
};

const panelCardStyle = {
  background: "#161a20",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: 14,
};

const panelTitleStyle = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 12,
};

const listRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#11151a",
};
