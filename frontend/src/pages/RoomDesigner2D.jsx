import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import "./RoomDesigner2D.css";

const API_BASE     = "http://localhost:5000/api";
const SCALE        = 40; // px per metre
const WALL_DEPTH_M = 0.5;
const MP           = 32; // canvas margin px

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/* ═══════════════════════════════════════════════
   ROOM SHAPE HELPERS
═══════════════════════════════════════════════ */

/**
 * Returns polygon points in metres for a given shape.
 * Coordinate system: x = horizontal (length), y = vertical (width)
 */
const getRoomPolygon = (shape, length, width) => {
  switch (shape) {
    case "L Room":
      return [
        { x: 0,          y: 0         },
        { x: length,     y: 0         },
        { x: length,     y: width / 2 },
        { x: length / 2, y: width / 2 },
        { x: length / 2, y: width     },
        { x: 0,          y: width     },
      ];
    default: // Rectangle
      return [
        { x: 0,      y: 0      },
        { x: length, y: 0      },
        { x: length, y: width  },
        { x: 0,      y: width  },
      ];
  }
};

/** Ray-casting point-in-polygon (metres) */
const isInsideRoom = (px, py, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
};

/** Check all 4 footprint corners are inside the room */
const furnitureInsideRoom = (x, y, fp, polygon) => {
  const hw = fp.width / 2, hd = fp.depth / 2;
  return [
    { x: x - hw, y: y - hd },
    { x: x + hw, y: y - hd },
    { x: x + hw, y: y + hd },
    { x: x - hw, y: y + hd },
  ].every(c => isInsideRoom(c.x, c.y, polygon));
};

/* ═══════════════════════════════════════════════
   FURNITURE HELPERS
═══════════════════════════════════════════════ */
const getFurnitureDimsM = (catalogItem) => ({
  width: (Number(catalogItem?.dimensions?.width) || 100) / 100,
  depth: (Number(catalogItem?.dimensions?.depth) || 100) / 100,
});

const getFootprintM = (item, catalogMap) => {
  const cat = catalogMap.get(String(item.furnitureId));
  const { width, depth } = getFurnitureDimsM(cat);
  const rot     = ((Number(item.rotation) || 0) % 180 + 180) % 180;
  const rotated = rot === 90;
  return { width: rotated ? depth : width, depth: rotated ? width : depth };
};

const isOverlapping = (candidate, others, catalogMap) => {
  const a  = getFootprintM(candidate, catalogMap);
  const aL = candidate.x - a.width / 2, aR = candidate.x + a.width / 2;
  const aT = candidate.y - a.depth / 2, aB = candidate.y + a.depth / 2;
  return others.some((o) => {
    const b  = getFootprintM(o, catalogMap);
    const bL = o.x - b.width / 2, bR = o.x + b.width / 2;
    const bT = o.y - b.depth / 2, bB = o.y + b.depth / 2;
    return !(aR <= bL || aL >= bR || aB <= bT || aT >= bB);
  });
};

/* ═══════════════════════════════════════════════
   DEFAULT STATE
═══════════════════════════════════════════════ */
const DEFAULT_DESIGN = {
  name:      "Minimalist Loft Oasis",
  roomType:  "Living Room",
  roomShape: "Rectangle",
  status:    "draft",
  notes:     "",
  room: {
    length:     12.5,
    width:      8.4,
    height:     3.2,
    wallColor:  "#2a1f1c",
    floorColor: "#3b2316",
  },
  furniture: [],
};

/* ═══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
export default function RoomDesigner2D({ initialDesignId, ownerId }) {
  const [searchParams]   = useSearchParams();
  const urlDesignId      = searchParams.get("designId");
  const activeDesignId   = initialDesignId || urlDesignId || null;

  const [designId,          setDesignId]          = useState(activeDesignId);
  const [loading,           setLoading]           = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [furnitureCatalog,  setFurnitureCatalog]  = useState([]);
  const [design,            setDesign]            = useState(DEFAULT_DESIGN);
  const [selectedIndex,     setSelectedIndex]     = useState(null);
  const [activeColorPicker, setActiveColorPicker] = useState(null);

  const canvasRef = useRef(null);
  const dragRef   = useRef({ index: null, offsetXM: 0, offsetYM: 0 });

  const selectedItem = selectedIndex != null ? design.furniture[selectedIndex] : null;

  const catalogMap = useMemo(() => {
    const m = new Map();
    furnitureCatalog.forEach((i) => m.set(String(i._id), i));
    return m;
  }, [furnitureCatalog]);

  const roomLength = design.room.length || 1;
  const roomWidth  = design.room.width  || 1;
  const roomShape  = design.roomShape   || "Rectangle";
  const token      = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  /* ── Computed polygon for current shape ── */
  const roomPolygon = useMemo(
    () => getRoomPolygon(roomShape, roomLength, roomWidth),
    [roomShape, roomLength, roomWidth]
  );

  /* ── State helpers ── */
  const updateDesign = (patch) => setDesign((p) => ({ ...p, ...patch }));
  const updateRoom   = (patch) => setDesign((p) => ({ ...p, room: { ...p.room, ...patch } }));

  const updateFurnitureAt = (index, patch) =>
    setDesign((prev) => {
      const copy    = [...prev.furniture];
      if (!copy[index]) return prev;
      const updated = { ...copy[index], ...patch };
      const fp      = getFootprintM(updated, catalogMap);
      const poly    = getRoomPolygon(prev.roomShape || "Rectangle", prev.room?.length || roomLength, prev.room?.width || roomWidth);
      if (typeof updated.x === "number" && typeof updated.y === "number") {
        updated.x = clamp(updated.x, fp.width / 2, (prev.room?.length || roomLength) - fp.width / 2);
        updated.y = clamp(updated.y, fp.depth / 2 + WALL_DEPTH_M, (prev.room?.width || roomWidth) - fp.depth / 2);
        if (!furnitureInsideRoom(updated.x, updated.y, fp, poly)) return prev;
      }
      copy[index] = updated;
      return { ...prev, furniture: copy };
    });

  /* ── Data fetching ── */
  useEffect(() => {
    fetch(`${API_BASE}/furniture`)
      .then((r) => r.json())
      .then((d) => setFurnitureCatalog(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeDesignId) return;
    setLoading(true);
    fetch(`${API_BASE}/designs/public/${activeDesignId}`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((data) => {
        setDesign({
          name:      data.name      || "Untitled Design",
          roomType:  data.roomType  || "Living Room",
          roomShape: data.roomShape || "Rectangle",
          status:    data.status    || "draft",
          notes:     data.notes     || "",
          room: {
            length:     data.room?.length     ?? 12.5,
            width:      data.room?.width      ?? 8.4,
            height:     data.room?.height     ?? 3.2,
            wallColor:  data.room?.wallColor  || "#2a1f1c",
            floorColor: data.room?.floorColor || "#3b2316",
          },
          furniture: Array.isArray(data.furniture) ? data.furniture : [],
          ownerId:   data.ownerId,
        });
        setDesignId(data._id);
        setSelectedIndex(null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeDesignId]);

  /* ── Add furniture ── */
const addFurnitureToRoom = (item) => {
  const dims    = getFurnitureDimsM(item);
  const polygon = getRoomPolygon(roomShape, roomLength, roomWidth);

  // ── Find a valid placement point inside the polygon ──
  // Try several candidate positions and use the first one that fits
  const candidates = [
    { x: roomLength * 0.25, y: roomWidth * 0.5  },    // Left-center area (always inside L shape)
    { x: roomLength * 0.25, y: roomWidth * 0.75 },    // Bottom-left quadrant
    { x: roomLength * 0.25, y: roomWidth * 0.25 },    // Top-left quadrant
    { x: roomLength * 0.5,  y: roomWidth * 0.5  },    // True center (works for rectangle, may fail for L)
    { x: roomLength * 0.75, y: roomWidth * 0.25 },    // Right-bottom area (inside L right arm)
  ];

  let placed = null;

  for (const candidate of candidates) {
    const x = clamp(candidate.x, dims.width / 2, roomLength - dims.width / 2);
    const y = clamp(candidate.y, dims.depth / 2 + WALL_DEPTH_M, roomWidth - dims.depth / 2);
    const fp = { width: dims.width, depth: dims.depth };

    if (furnitureInsideRoom(x, y, fp, polygon)) {
      placed = { x, y };
      break;
    }
  }

  if (!placed) {
    alert("Cannot place furniture: item is too large for any available space.");
    return;
  }

  const newItem = {
    furnitureId: item._id,
    type:        item.category,
    x:           placed.x,
    y:           placed.y,
    rotation:    0,
    scale:       1,
  };

  if (isOverlapping(newItem, design.furniture, catalogMap)) {
    alert("Cannot place furniture: overlaps another item.");
    return;
  }

  setDesign((p) => ({ ...p, furniture: [...p.furniture, newItem] }));
  setSelectedIndex(design.furniture.length);
};

  /* ── Delete furniture ── */
  const deleteSelected = () => {
    if (selectedIndex == null) return;
    setDesign((p) => {
      const copy = [...p.furniture];
      copy.splice(selectedIndex, 1);
      return { ...p, furniture: copy };
    });
    setSelectedIndex(null);
  };

  /* ── Drag ── */
  const beginDrag = (e, index) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const item = design.furniture[index];
    dragRef.current = {
      index,
      offsetXM: (e.clientX - rect.left  - (item.x * SCALE + MP)) / SCALE,
      offsetYM: (e.clientY - rect.top   - (item.y * SCALE + MP)) / SCALE,
    };
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup",   endDrag);
  };

  const onDrag = (e) => {
    const { index, offsetXM, offsetYM } = dragRef.current;
    if (index == null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - MP) / SCALE - offsetXM;
    const rawY = (e.clientY - rect.top  - MP) / SCALE - offsetYM;
    const item = design.furniture[index];
    const fp   = getFootprintM(item, catalogMap);
    const newX = clamp(rawX, fp.width / 2, roomLength - fp.width / 2);
    const newY = clamp(rawY, fp.depth / 2, roomWidth  - fp.depth / 2);

    if (!isInsideRoom(newX, newY, roomPolygon)) return;

    const candidate = { ...item, x: newX, y: newY };
    if (isOverlapping(candidate, design.furniture.filter((_, i) => i !== index), catalogMap)) return;

    setDesign((p) => {
      const copy = [...p.furniture];
      if (!copy[index]) return p;
      copy[index] = { ...copy[index], x: newX, y: newY };
      return { ...p, furniture: copy };
    });
  };

  const endDrag = () => {
    dragRef.current = { index: null, offsetXM: 0, offsetYM: 0 };
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup",   endDrag);
  };

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...design, ownerId: ownerId || design.ownerId };
      const res  = await fetch(`${API_BASE}/designs${designId ? `/${designId}` : ""}`, {
        method:  designId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert(`Failed to save (${res.status}).`); return; }
      const saved = await res.json();
      setDesignId(saved._id);
      alert("Design saved successfully.");
    } catch { alert("Server error while saving."); }
    finally  { setSaving(false); }
  };

  /* ── Rotate ── */
  const rotateSelected = () => {
    if (!selectedItem) return;
    const newRot  = ((selectedItem.rotation || 0) + 90) % 360;
    const ci      = catalogMap.get(String(selectedItem.furnitureId));
    const { width: rawW, depth: rawD } = getFurnitureDimsM(ci);
    const swapped = ((newRot % 180) + 180) % 180 === 90;
    const footW   = swapped ? rawD : rawW;
    const footD   = swapped ? rawW : rawD;
    const cx      = clamp(selectedItem.x, footW / 2, roomLength - footW / 2);
    const cy      = clamp(selectedItem.y, footD / 2, roomWidth  - footD / 2);
    const fp      = { width: footW, depth: footD };
    if (!furnitureInsideRoom(cx, cy, fp, roomPolygon)) {
      alert("Cannot rotate: would go outside room boundary.");
      return;
    }
    const candidate = { ...selectedItem, rotation: newRot, x: cx, y: cy };
    if (isOverlapping(candidate, design.furniture.filter((_, i) => i !== selectedIndex), catalogMap)) {
      alert("Cannot rotate: would overlap another item.");
      return;
    }
    updateFurnitureAt(selectedIndex, { rotation: newRot, x: cx, y: cy });
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="rd-loading">
        <span className="material-icons-round">autorenew</span>
        Loading design…
      </div>
    );
  }

  /* ── Canvas dimensions (bounding box of polygon) ── */
  const canvasW = roomLength * SCALE + MP * 2;
  const canvasH = roomWidth  * SCALE + MP * 2;

  /* ── SVG polygon points string ── */
  const svgPoints = roomPolygon
    .map(p => `${p.x * SCALE + MP},${p.y * SCALE + MP}`)
    .join(" ");

  /* ── Dashboard link: back to right place by role ── */
  const role          = localStorage.getItem("role");
  const dashboardLink = role === "admin" ? "/admin" : "/dashboard";

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="rd-root">

      {/* ── TOP BAR ── */}
      <header className="rd-topbar">
        <div className="rd-brand">
          <div className="rd-brand-icon">
            <span className="material-icons-round">chair</span>
          </div>
          <span className="rd-brand-name">Everwood & Co.</span>
          <span className="rd-brand-sep">/</span>
          <span className="rd-brand-sub">Room Designer</span>
        </div>

        <div className="rd-topbar-actions">
          <Link
            to={designId ? `/room-3d?designId=${designId}` : "#"}
            className={`rd-btn rd-btn-outline${!designId ? " rd-btn-disabled" : ""}`}
            onClick={(e) => { if (!designId) { e.preventDefault(); alert("Save the design first."); } }}
          >
            <span className="material-icons-round">view_in_ar</span>
            3D View
          </Link>

          <button className="rd-btn rd-btn-ghost" onClick={handleSave} disabled={saving}>
            <span className="material-icons-round">content_copy</span>
            {saving ? "Saving…" : "Save copy"}
          </button>

          <button className="rd-btn rd-btn-primary" onClick={handleSave} disabled={saving}>
            <span className="material-icons-round">save</span>
            {saving ? "Saving…" : "Save"}
          </button>

          <Link to={dashboardLink} className="rd-btn rd-btn-ghost">
            <span className="material-icons-round">dashboard</span>
            Dashboard
          </Link>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div className="rd-layout">

        {/* ════════════════════
            LEFT SIDEBAR
        ════════════════════ */}
        <aside className="rd-sidebar">

          {/* Design info */}
          <div className="rd-panel">
            <div className="rd-panel-title">Design info</div>

            <label className="rd-label">Name</label>
            <input
              className="rd-input"
              value={design.name}
              onChange={(e) => updateDesign({ name: e.target.value })}
            />

            <label className="rd-label" style={{ marginTop: 6 }}>Room type</label>
            <select
              className="rd-input rd-select"
              value={design.roomType}
              onChange={(e) => updateDesign({ roomType: e.target.value })}
            >
              <option>Living Room</option>
              <option>Bedroom</option>
              <option>Dining</option>
              <option>Office</option>
            </select>

            <label className="rd-label" style={{ marginTop: 6 }}>Room shape</label>
            <select
              className="rd-input rd-select"
              value={design.roomShape || "Rectangle"}
              onChange={(e) => {
                updateDesign({ roomShape: e.target.value });
                // Clear furniture when shape changes to avoid out-of-bounds items
                if (design.furniture.length > 0) {
                  if (window.confirm("Changing shape will clear placed furniture. Continue?")) {
                    setDesign((p) => ({ ...p, roomShape: e.target.value, furniture: [] }));
                    setSelectedIndex(null);
                  }
                }
              }}
            >
              <option value="Rectangle">Rectangle</option>
              <option value="L Room">L Room</option>
            </select>
          </div>

          {/* Dimensions */}
          <div className="rd-panel">
            <div className="rd-panel-title">Dimensions (m)</div>
            <div className="rd-dims-grid">
              {[["Length","length"],["Width","width"],["Height","height"]].map(([label, key]) => (
                <div key={key}>
                  <label className="rd-label">{label}</label>
                  <input
                    type="number" step="0.1"
                    className="rd-input"
                    value={design.room[key]}
                    onChange={(e) => updateRoom({ [key]: Number(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Colours */}
          <div className="rd-panel">
            <div className="rd-panel-title">Colours</div>
            {[["Wall","wallColor","wall"],["Floor","floorColor","floor"]].map(([label, key, id]) => (
              <div key={id} className="rd-color-row">
                <div
                  className="rd-swatch"
                  style={{ background: design.room[key] }}
                  onClick={() => setActiveColorPicker(activeColorPicker === id ? null : id)}
                />
                <div className="rd-color-info">
                  <div className="rd-color-label">{label}</div>
                  <div className="rd-color-hex">{design.room[key]}</div>
                </div>
                {activeColorPicker === id && (
                  <div className="rd-color-popover">
                    <HexColorPicker
                      color={design.room[key]}
                      onChange={(c) => updateRoom({ [key]: c })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* ════════════════════
            CANVAS AREA
        ════════════════════ */}
        <main className="rd-canvas-area">
          <div className="rd-canvas-bar">
            <span className="rd-canvas-title">2D Layout — {roomShape}</span>
            <span className="rd-canvas-hint">{roomLength}m × {roomWidth}m</span>
          </div>

          <div className="rd-canvas-scroll">
            <div
              ref={canvasRef}
              className="rd-canvas"
              style={{ width: canvasW, height: canvasH }}
              onMouseDown={() => setSelectedIndex(null)}
            >
              {/* ── Room shape SVG ── */}
              <svg
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: canvasW, height: canvasH,
                  pointerEvents: "none", zIndex: 1,
                }}
              >
                <defs>
                  <clipPath id="roomClip">
                    <polygon points={svgPoints} />
                  </clipPath>
                </defs>

                {/* Floor fill */}
                <polygon
                  points={svgPoints}
                  fill={design.room.floorColor}
                  stroke="rgba(77,136,255,.7)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Wall strip — top 12%, clipped to shape */}
                <rect
                  x={MP} y={MP}
                  width={roomLength * SCALE}
                  height={roomWidth * SCALE * 0.12}
                  fill={design.room.wallColor}
                  clipPath="url(#roomClip)"
                />
              </svg>

              {/* ── Furniture pieces ── */}
              {design.furniture.map((item, index) => {
                const cat   = catalogMap.get(String(item.furnitureId));
                const dims  = getFurnitureDimsM(cat);
                const wPx   = dims.width * SCALE;
                const dPx   = dims.depth * SCALE;
                const isSel = index === selectedIndex;

                return (
                  <div
                    key={`${item.furnitureId}-${index}`}
                    className={`rd-furniture${isSel ? " selected" : ""}`}
                    style={{
                      left:      item.x * SCALE + MP,
                      top:       item.y * SCALE + MP,
                      width:     wPx,
                      height:    dPx,
                      transform: `translate(-50%,-50%) rotate(${item.rotation || 0}deg)`,
                      zIndex:    isSel ? 10 : 2,
                    }}
                    onMouseDown={(e) => beginDrag(e, index)}
                    onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
                  >
                    <span className="material-icons-round" style={{ fontSize: Math.min(wPx, dPx) * 0.45 }}>
                      weekend
                    </span>
                    {isSel && (
                      <div className="rd-furniture-label">{cat?.name || item.type}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ════════════════════
            RIGHT INSPECTOR
        ════════════════════ */}
        <aside className="rd-inspector">
          <div className="rd-panel rd-panel-catalog" style={{ flex: 1, minHeight: 0 }}>
            <div className="rd-panel-title">
              Catalogue
              <span className="rd-count-badge">{furnitureCatalog.length}</span>
            </div>
            <div className="rd-catalog-list">
              {furnitureCatalog.map((item) => (
                <button key={item._id} className="rd-catalog-item" onClick={() => addFurnitureToRoom(item)}>
                  <div className="rd-catalog-icon-wrap">
                    <span className="material-icons-round">weekend</span>
                  </div>
                  <div className="rd-catalog-info">
                    <div className="rd-catalog-name">{item.name}</div>
                    <div className="rd-catalog-meta">
                      {item.category} · {item.dimensions?.width}×{item.dimensions?.depth}cm
                    </div>
                  </div>
                  <span className="material-icons-round rd-catalog-add">add</span>
                </button>
              ))}
              {furnitureCatalog.length === 0 && <div className="rd-empty">No furniture found.</div>}
            </div>
          </div>

          <div className="rd-panel" style={{ flex: 1, minHeight: 0 }}>
            <div className="rd-panel-title">Object inspector</div>

            {selectedItem ? (
              <div className="rd-inspector-content">

                <div className="rd-inspector-head">
                  <div className="rd-inspector-thumb">
                    <span className="material-icons-round">weekend</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rd-inspector-name">
                      {furnitureCatalog.find((f) => f._id === selectedItem.furnitureId)?.name || selectedItem.type}
                    </div>
                    <div className="rd-inspector-type">{selectedItem.type}</div>
                  </div>
                  <button className="rd-btn-icon" title="Rotate 90°" onClick={rotateSelected}>
                    <span className="material-icons-round">rotate_right</span>
                  </button>
                </div>

                <div className="rd-inspector-section">Position (m)</div>
                <div className="rd-xy-grid">
                  {[["X","x"],["Y","y"]].map(([label, key]) => (
                    <div key={key} className="rd-input-group">
                      <span className="rd-input-prefix">{label}</span>
                      <input
                        type="number" step="0.1"
                        className="rd-input-inline"
                        value={Number(selectedItem[key].toFixed(2))}
                        onChange={(e) => updateFurnitureAt(selectedIndex, { [key]: Number(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>

                <div className="rd-inspector-section">Rotation (°)</div>
                <input
                  type="number"
                  className="rd-input"
                  value={selectedItem.rotation || 0}
                  onChange={(e) => {
                    const newRot  = Number(e.target.value) || 0;
                    const ci      = catalogMap.get(String(selectedItem.furnitureId));
                    const { width: rawW, depth: rawD } = getFurnitureDimsM(ci);
                    const swapped = ((newRot % 180) + 180) % 180 === 90;
                    const footW   = swapped ? rawD : rawW;
                    const footD   = swapped ? rawW : rawD;
                    const cx      = clamp(selectedItem.x, footW / 2, roomLength - footW / 2);
                    const cy      = clamp(selectedItem.y, footD / 2, roomWidth  - footD / 2);
                    updateFurnitureAt(selectedIndex, { rotation: newRot, x: cx, y: cy });
                  }}
                />

                <div style={{ flex: 1 }} />

                <button className="rd-btn rd-btn-danger" onClick={deleteSelected}>
                  <span className="material-icons-round">delete_outline</span>
                  Remove item
                </button>

              </div>
            ) : (
              <div className="rd-inspector-empty">
                <span className="material-icons-round">touch_app</span>
                Select a furniture item to edit its properties
              </div>
            )}
          </div>

          {/* Room summary */}
          <div className="rd-panel">
            <div className="rd-panel-title">Room summary</div>
            <div className="rd-stats-grid">
              {[
                { value: design.furniture.length,             label: "Items"   },
                { value: (roomLength * roomWidth).toFixed(1), label: "Area m²" },
                { value: `${design.room.height}m`,            label: "Height"  },
              ].map(({ value, label }) => (
                <div key={label} className="rd-stat">
                  <div className="rd-stat-value">{value}</div>
                  <div className="rd-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}