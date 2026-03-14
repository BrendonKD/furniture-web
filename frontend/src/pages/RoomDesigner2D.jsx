import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import "./RoomDesigner2D.css";

const API_BASE = "http://localhost:5000/api";
const SCALE = 40; // pixels per metre
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const getFurnitureDimsM = (catalogItem) => ({
  width: (Number(catalogItem?.dimensions?.width) || 100) / 100,
  depth: (Number(catalogItem?.dimensions?.depth) || 100) / 100,
});

const getFootprintM = (furnitureItem, catalogMap) => {
  const catalogItem = catalogMap.get(String(furnitureItem.furnitureId));
  const { width, depth } = getFurnitureDimsM(catalogItem);
  const rotation = ((Number(furnitureItem.rotation) || 0) % 180 + 180) % 180;
  const rotated = rotation === 90;
  return { width: rotated ? depth : width, depth: rotated ? width : depth };
};

const isOverlapping = (candidate, others, catalogMap) => {
  const a = getFootprintM(candidate, catalogMap);
  const aL = candidate.x - a.width / 2, aR = candidate.x + a.width / 2;
  const aT = candidate.y - a.depth / 2, aB = candidate.y + a.depth / 2;

  return others.some((other) => {
    const b = getFootprintM(other, catalogMap);
    const bL = other.x - b.width / 2, bR = other.x + b.width / 2;
    const bT = other.y - b.depth / 2, bB = other.y + b.depth / 2;
    return !(aR <= bL || aL >= bR || aB <= bT || aT >= bB);
  });
};

export default function RoomDesigner2D({ initialDesignId, ownerId }) {
  const [searchParams] = useSearchParams();
  const urlDesignId = searchParams.get("designId");
  const activeDesignId = initialDesignId || urlDesignId || null;

  const [designId, setDesignId] = useState(activeDesignId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [furnitureCatalog, setFurnitureCatalog] = useState([]);
  const [design, setDesign] = useState({
    name: "Minimalist Loft Oasis",
    roomType: "Living Room",
    status: "draft",
    notes: "",
    room: { length: 12.5, width: 8.4, height: 3.2, wallColor: "#2a1f1c", floorColor: "#3b2316" },
    furniture: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [activeColorPicker, setActiveColorPicker] = useState(null); // 'wall' | 'floor' | null

  const canvasRef = useRef(null);
  const dragRef = useRef({ index: null, offsetXM: 0, offsetYM: 0 });

  const selectedItem = selectedIndex != null ? design.furniture[selectedIndex] : null;
  const catalogMap = useMemo(() => {
    const map = new Map();
    furnitureCatalog.forEach((item) => map.set(String(item._id), item));
    return map;
  }, [furnitureCatalog]);

  const roomLength = design.room.length || 1;
  const roomWidth = design.room.width || 1;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const updateDesign = (patch) => setDesign((prev) => ({ ...prev, ...patch }));
  const updateRoom = (patch) => setDesign((prev) => ({ ...prev, room: { ...prev.room, ...patch } }));
  const updateFurnitureAt = (index, patch) =>
    setDesign((prev) => {
      const copy = [...prev.furniture];
      if (!copy[index]) return prev;
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, furniture: copy };
    });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/furniture`);
        const data = await res.json();
        setFurnitureCatalog(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load furniture", err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!activeDesignId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/designs/public/${activeDesignId}`);
        if (!res.ok) throw new Error(`Failed to load design: ${res.status}`);
        const data = await res.json();
        setDesign({
          name: data.name || "Untitled Design",
          roomType: data.roomType || "Living Room",
          status: data.status || "draft",
          notes: data.notes || "",
          room: {
            length: data.room?.length ?? 12.5,
            width: data.room?.width ?? 8.4,
            height: data.room?.height ?? 3.2,
            wallColor: data.room?.wallColor || "#2a1f1c",
            floorColor: data.room?.floorColor || "#3b2316",
          },
          furniture: Array.isArray(data.furniture) ? data.furniture : [],
          ownerId: data.ownerId,
        });
        setDesignId(data._id);
        setSelectedIndex(null);
      } catch (err) {
        console.error("Failed to load design", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeDesignId]);

  const addFurnitureToRoom = (item) => {
    const dims = getFurnitureDimsM(item);
    const newItem = {
      furnitureId: item._id,
      type: item.category,
      x: clamp(roomLength / 2, dims.width / 2, roomLength - dims.width / 2),
      y: clamp(roomWidth / 2, dims.depth / 2, roomWidth - dims.depth / 2),
      rotation: 0,
      scale: 1,
    };
    if (isOverlapping(newItem, design.furniture, catalogMap)) {
      alert("Cannot place furniture: overlaps another item.");
      return;
    }
    setDesign((prev) => ({ ...prev, furniture: [...prev.furniture, newItem] }));
    setSelectedIndex(design.furniture.length);
  };

  const beginDrag = (e, index) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const item = design.furniture[index];
    // item.x/y are in metres; canvas has a MARGIN_PX offset for the room rect
    const MARGIN_PX = 32;
    const itemXpx = item.x * SCALE + MARGIN_PX;
    const itemYpx = item.y * SCALE + MARGIN_PX;
    const mouseXpx = e.clientX - rect.left;
    const mouseYpx = e.clientY - rect.top;
    dragRef.current = {
      index,
      offsetXM: (mouseXpx - itemXpx) / SCALE,
      offsetYM: (mouseYpx - itemYpx) / SCALE,
    };
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", endDrag);
  };

  const onDrag = (e) => {
    const { index, offsetXM, offsetYM } = dragRef.current;
    if (index == null || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const MARGIN_PX = 32;
    const mouseXpx = e.clientX - rect.left - MARGIN_PX;
    const mouseYpx = e.clientY - rect.top - MARGIN_PX;

    const rawX = mouseXpx / SCALE - offsetXM;
    const rawY = mouseYpx / SCALE - offsetYM;

    const item = design.furniture[index];
    const footprint = getFootprintM(item, catalogMap);
    const halfW = footprint.width / 2;
    const halfD = footprint.depth / 2;

    const newX = clamp(rawX, halfW, roomLength - halfW);
    const newY = clamp(rawY, halfD, roomWidth - halfD);

    // Check overlap excluding self
    const candidate = { ...item, x: newX, y: newY };
    const others = design.furniture.filter((_, i) => i !== index);
    if (isOverlapping(candidate, others, catalogMap)) return;

    setDesign((prev) => {
      const copy = [...prev.furniture];
      if (!copy[index]) return prev;
      copy[index] = { ...copy[index], x: newX, y: newY };
      return { ...prev, furniture: copy };
    });
  };

  const endDrag = () => {
    dragRef.current = { index: null, offsetXM: 0, offsetYM: 0 };
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", endDrag);
  };

  const deleteSelected = () => {
    if (selectedIndex == null) return;
    setDesign((prev) => {
      const copy = [...prev.furniture];
      copy.splice(selectedIndex, 1);
      return { ...prev, furniture: copy };
    });
    setSelectedIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...design, ownerId: ownerId || design.ownerId };
      const res = await fetch(`${API_BASE}/designs${designId ? `/${designId}` : ""}`, {
        method: designId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert(`Failed to save design (${res.status}).`); return; }
      const saved = await res.json();
      setDesignId(saved._id);
      alert("Design saved successfully.");
    } catch (err) {
      alert("Server error while saving design.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="ew-loading">Loading design…</div>;

  // Canvas pixel dimensions — room in pixels + margins
  const MARGIN_PX = 32;
  const canvasW = roomLength * SCALE + MARGIN_PX * 2;
  const canvasH = roomWidth * SCALE + MARGIN_PX * 2;

  return (
    <div className="ew-root">
      {/* ── Top bar ── */}
      <header className="ew-topbar">
        <div className="ew-topbar-brand">
          <span className="ew-logo-mark">⬡</span>
          <span className="ew-brand-name">Everwood</span>
          <span className="ew-brand-sep">/</span>
          <span className="ew-brand-sub">Room Designer</span>
        </div>

        <div className="ew-topbar-actions">
          <Link
            to={designId ? `/room-3d?designId=${designId}` : "#"}
            className={`ew-btn ew-btn-outline ${!designId ? "ew-btn-disabled" : ""}`}
            onClick={(e) => { if (!designId) { e.preventDefault(); alert("Please save the design first."); } }}
          >
            <span className="material-icons-round" style={{ fontSize: 16 }}>view_in_ar</span>
            3D View
          </Link>
          <button className="ew-btn ew-btn-ghost" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save copy"}
          </button>
          <button className="ew-btn ew-btn-accent" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <Link to="/admin" className="ew-btn ew-btn-ghost">
            <span className="material-icons-round" style={{ fontSize: 16 }}>dashboard</span>
            Dashboard
          </Link>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="ew-layout">
        {/* Left panel */}
        <aside className="ew-sidebar">
          <div className="ew-panel">
            <div className="ew-panel-title">Design info</div>
            <label className="ew-label">Name</label>
            <input
              className="ew-input"
              value={design.name}
              onChange={(e) => updateDesign({ name: e.target.value })}
            />
            <label className="ew-label" style={{ marginTop: 10 }}>Room type</label>
            <select className="ew-input" value={design.roomType} onChange={(e) => updateDesign({ roomType: e.target.value })}>
              <option>Living Room</option>
              <option>Bedroom</option>
              <option>Dining</option>
              <option>Office</option>
            </select>
          </div>

          <div className="ew-panel">
            <div className="ew-panel-title">Dimensions (m)</div>
            <div className="ew-dim-grid">
              {[["Length", "length"], ["Width", "width"], ["Height", "height"]].map(([label, key]) => (
                <div key={key}>
                  <label className="ew-label">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="ew-input"
                    value={design.room[key]}
                    onChange={(e) => updateRoom({ [key]: Number(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="ew-panel">
            <div className="ew-panel-title">Colours</div>
            {[["Wall", "wallColor", "wall"], ["Floor", "floorColor", "floor"]].map(([label, key, id]) => (
              <div key={id} className="ew-color-row">
                <div
                  className="ew-color-swatch"
                  style={{ background: design.room[key] }}
                  onClick={() => setActiveColorPicker(activeColorPicker === id ? null : id)}
                />
                <div>
                  <div className="ew-color-label">{label}</div>
                  <div className="ew-color-hex">{design.room[key]}</div>
                </div>
                {activeColorPicker === id && (
                  <div className="ew-color-popover">
                    <HexColorPicker
                      color={design.room[key]}
                      onChange={(color) => updateRoom({ [key]: color })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="ew-panel ew-panel-catalog">
            <div className="ew-panel-title">
              Catalogue
              <span className="ew-catalog-count">{furnitureCatalog.length}</span>
            </div>
            <div className="ew-catalog-list">
              {furnitureCatalog.map((item) => (
                <button key={item._id} className="ew-catalog-item" onClick={() => addFurnitureToRoom(item)}>
                  <span className="material-icons-round ew-catalog-icon">weekend</span>
                  <div className="ew-catalog-info">
                    <div className="ew-catalog-name">{item.name}</div>
                    <div className="ew-catalog-meta">{item.category} · {item.dimensions?.width}×{item.dimensions?.depth}cm</div>
                  </div>
                  <span className="material-icons-round ew-catalog-add">add</span>
                </button>
              ))}
              {furnitureCatalog.length === 0 && (
                <div className="ew-empty-msg">No furniture found.</div>
              )}
            </div>
          </div>
        </aside>

        {/* Canvas area */}
        <main className="ew-canvas-area">
          <div className="ew-canvas-toolbar">
            <span className="ew-canvas-title">2D Layout</span>
            <span className="ew-canvas-hint">{roomLength}m × {roomWidth}m</span>
          </div>

          <div className="ew-canvas-scroll">
            <div
              ref={canvasRef}
              className="ew-room-canvas"
              style={{ width: canvasW, height: canvasH }}
              onMouseDown={() => setSelectedIndex(null)}
            >
              {/* Room rectangle */}
              <div
                className="ew-room-rect"
                style={{
                  left: MARGIN_PX,
                  top: MARGIN_PX,
                  width: roomLength * SCALE,
                  height: roomWidth * SCALE,
                  background: `linear-gradient(160deg, ${design.room.wallColor} 0 28%, ${design.room.floorColor} 28% 100%)`,
                }}
              />

              {/* Furniture pieces */}
              {design.furniture.map((item, index) => {
                const catalogItem = catalogMap.get(String(item.furnitureId));
                const dims = getFurnitureDimsM(catalogItem);
                const wPx = dims.width * SCALE;
                const dPx = dims.depth * SCALE;
                // item.x/y in metres from room origin (0→length, 0→width)
                const leftPx = item.x * SCALE + MARGIN_PX;
                const topPx = item.y * SCALE + MARGIN_PX;
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={`${item.furnitureId}-${index}`}
                    className={`ew-furniture-item${isSelected ? " selected" : ""}`}
                    style={{
                      left: leftPx,
                      top: topPx,
                      width: wPx,
                      height: dPx,
                      transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                    }}
                    onMouseDown={(e) => beginDrag(e, index)}
                    onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
                  >
                    <span className="material-icons-round" style={{ fontSize: Math.min(wPx, dPx) * 0.45 }}>
                      weekend
                    </span>
                    {isSelected && (
                      <div className="ew-furniture-label">
                        {catalogItem?.name || item.type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right inspector panel */}
        <aside className="ew-inspector">
          <div className="ew-panel" style={{ flex: 1 }}>
            <div className="ew-panel-title">Object inspector</div>

            {selectedItem ? (
              <div className="ew-inspector-content">
                {/* Item header */}
                <div className="ew-inspector-header">
                  <div className="ew-inspector-icon">
                    <span className="material-icons-round" style={{ fontSize: 18, color: "#e3b566" }}>weekend</span>
                  </div>
                  <div>
                    <div className="ew-inspector-name">
                      {furnitureCatalog.find((f) => f._id === selectedItem.furnitureId)?.name || selectedItem.type}
                    </div>
                    <div className="ew-inspector-type">{selectedItem.type}</div>
                  </div>
                  <button
                    className="ew-btn-icon"
                    title="Rotate 90°"
                    onClick={() => {
                      const newRot = ((selectedItem.rotation || 0) + 90) % 360;
                      const candidate = { ...selectedItem, rotation: newRot };
                      const others = design.furniture.filter((_, i) => i !== selectedIndex);
                      if (isOverlapping(candidate, others, catalogMap)) {
                        alert("Cannot rotate: would overlap another item.");
                        return;
                      }
                      updateFurnitureAt(selectedIndex, { rotation: newRot });
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: 18 }}>rotate_right</span>
                  </button>
                </div>

                {/* Position */}
                <div className="ew-inspector-section-label">Position (m)</div>
                <div className="ew-input-row">
                  {[["X", "x"], ["Y", "y"]].map(([label, key]) => (
                    <div key={key} className="ew-input-group">
                      <label className="ew-input-prefix">{label}</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ew-input ew-input-inline"
                        value={Number(selectedItem[key].toFixed(2))}
                        onChange={(e) => updateFurnitureAt(selectedIndex, { [key]: Number(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>

                {/* Rotation */}
                <div className="ew-inspector-section-label">Rotation</div>
                <input
                  type="number"
                  className="ew-input"
                  value={selectedItem.rotation || 0}
                  onChange={(e) => updateFurnitureAt(selectedIndex, { rotation: Number(e.target.value) || 0 })}
                />

                <div style={{ flex: 1 }} />

                <button className="ew-btn ew-btn-danger" style={{ width: "100%", marginTop: 16 }} onClick={deleteSelected}>
                  <span className="material-icons-round" style={{ fontSize: 16 }}>delete</span>
                  Delete object
                </button>
              </div>
            ) : (
              <div className="ew-inspector-empty">
                <span className="material-icons-round" style={{ fontSize: 32, color: "#2a2a2a" }}>
                  touch_app
                </span>
                <div>Select a furniture item to edit its properties</div>
              </div>
            )}
          </div>

          {/* Stats summary */}
          <div className="ew-panel ew-stats-panel">
            <div className="ew-panel-title">Room summary</div>
            <div className="ew-stats-grid">
              <div className="ew-stat">
                <div className="ew-stat-val">{design.furniture.length}</div>
                <div className="ew-stat-lbl">Items</div>
              </div>
              <div className="ew-stat">
                <div className="ew-stat-val">{(roomLength * roomWidth).toFixed(1)}</div>
                <div className="ew-stat-lbl">Area m²</div>
              </div>
              <div className="ew-stat">
                <div className="ew-stat-val">{design.room.height}m</div>
                <div className="ew-stat-lbl">Height</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}