import React, { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import "./RoomDesigner2D.css";

const API_BASE = "http://localhost:5000/api"; // adjust to your backend
const SCALE = 40; // pixels per metre
const WALL_MARGIN_M = 0.2; // 20cm buffer from each wall

export default function RoomDesigner2D({ initialDesignId, ownerId }) {
  const [designId, setDesignId] = useState(initialDesignId || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [furnitureCatalog, setFurnitureCatalog] = useState([]);
  const [design, setDesign] = useState({
    name: "Minimalist Loft Oasis",
    roomType: "Living Room",
    status: "draft",
    notes: "",
    room: {
      length: 12.5,
      width: 8.4,
      height: 3.2,
      wallColor: "#2a1f1c",
      floorColor: "#3b2316",
    },
    furniture: [], // items: { furnitureId, type, x, y, rotation, scale, baseSize }
  });

  const [selectedIndex, setSelectedIndex] = useState(null);

  const canvasRef = useRef(null);
  const dragRef = useRef({
    index: null,
    offsetXM: 0,
    offsetYM: 0,
  });

  const selectedItem =
    selectedIndex != null ? design.furniture[selectedIndex] : null;

  const roomLength = design.room.length || 1;
  const roomWidth = design.room.width || 1;

  // -------- Load furniture catalogue ----------
  useEffect(() => {
    const loadFurniture = async () => {
      try {
        const res = await fetch(`${API_BASE}/furniture`);
        const data = await res.json();
        setFurnitureCatalog(data);
      } catch (err) {
        console.error("Failed to load furniture", err);
      }
    };
    loadFurniture();
  }, []);

  // -------- Load existing design (edit mode) ----------
  useEffect(() => {
    const loadDesign = async () => {
      if (!initialDesignId) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/designs/${initialDesignId}`);
        const data = await res.json();
        setDesign(data);
        setDesignId(data._id);
      } catch (err) {
        console.error("Failed to load design", err);
      } finally {
        setLoading(false);
      }
    };
    loadDesign();
  }, [initialDesignId]);

  // -------- Helpers to update design state ----------
  const updateDesign = (patch) =>
    setDesign((prev) => ({
      ...prev,
      ...patch,
    }));

  const updateRoom = (patch) =>
    setDesign((prev) => ({
      ...prev,
      room: { ...prev.room, ...patch },
    }));

  const updateFurnitureAt = (index, patch) =>
    setDesign((prev) => {
      const copy = [...prev.furniture];
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, furniture: copy };
    });

  // -------- Add furniture item (position in metres) ----------
  const addFurnitureToRoom = (item) => {
    const length = roomLength || 1;
    const width = roomWidth || 1;

    const newItem = {
      furnitureId: item._id,
      type: item.category,
      // position in metres, roughly in middle
      x: length / 2,
      y: width / 2,
      rotation: 0, // degrees
      scale: 1,
      baseSize: 1.0,
    };

    setDesign((prev) => ({
      ...prev,
      furniture: [...prev.furniture, newItem],
    }));
    setSelectedIndex(design.furniture.length);
  };

  // -------- Drag handling (works in metres) ----------
  const beginDrag = (e, index) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const item = design.furniture[index];

    const mouseXpx = e.clientX - rect.left;
    const mouseYpx = e.clientY - rect.top;

    const itemXpx = item.x * SCALE;
    const itemYpx = item.y * SCALE;

    const offsetXM = (mouseXpx - itemXpx) / SCALE;
    const offsetYM = (mouseYpx - itemYpx) / SCALE;

    dragRef.current = {
      index,
      offsetXM,
      offsetYM,
    };

    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", endDrag);
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const onDrag = (e) => {
    if (dragRef.current.index == null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const mouseXpx = e.clientX - rect.left;
    const mouseYpx = e.clientY - rect.top;

    const mouseXM = mouseXpx / SCALE;
    const mouseYM = mouseYpx / SCALE;

    const { offsetXM, offsetYM, index } = dragRef.current;

    const rawX = mouseXM - offsetXM;
    const rawY = mouseYM - offsetYM;

    const maxX = roomLength - WALL_MARGIN_M;
    const maxY = roomWidth - WALL_MARGIN_M;

    const newXM = clamp(rawX, WALL_MARGIN_M, maxX);
    const newYM = clamp(rawY, WALL_MARGIN_M, maxY);

    setDesign((prev) => {
      const copy = [...prev.furniture];
      if (!copy[index]) return prev;
      copy[index] = {
        ...copy[index],
        x: newXM,
        y: newYM,
      };
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

  // -------- Save / Update design ----------

  const token = typeof window !== "undefined"
  ? localStorage.getItem("token")
  : null;
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...design,
        ownerId: ownerId || design.ownerId,
      };

      const res = await fetch(
        `${API_BASE}/designs${designId ? `/${designId}` : ""}`,
        {
          method: designId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Save error:", res.status, errData);
        alert(`Failed to save design (${res.status}).`);
        return;
      }

      const saved = await res.json();
      if (!designId) setDesignId(saved._id);
    } catch (err) {
      console.error("Failed to save design", err);
      alert("Server error while saving design.");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="container-fluid text-light p-4">Loading design...</div>
    );
  }

  return (
    <div className="container-fluid text-light p-0">
      {/* Top bar */}
      <div className="ew-topbar d-flex align-items-center justify-content-between px-4 py-2">
        <div className="d-flex align-items-center gap-2">
          <span className="material-icons-round text-warning">chair</span>
          <span className="fw-semibold">Everwood &amp; Co.</span>
          <span className="text-secondary small">/ Room Designer</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary text-light border-0">
            <span className="material-icons-round me-1" style={{ fontSize: 18 }}>
              dashboard
            </span>
            Exit to dashboard
          </button>
          <button className="btn btn-sm btn-outline-secondary text-light border-0">
            Save as new
          </button>
          <button
            className="btn btn-sm btn-ew-accent"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="row g-3 p-3">
        {/* LEFT PANEL */}
        <div className="col-3">
          {/* Basic info */}
          <div className="ew-panel p-3 mb-3">
            <div className="ew-section-title mb-2">Basic info</div>
            <div className="mb-2">
              <label className="form-label small text-uppercase text-secondary">
                Design name
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-dark border-0 text-light"
                value={design.name}
                onChange={(e) => updateDesign({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label small text-uppercase text-secondary">
                Room type
              </label>
              <select
                className="form-select form-select-sm bg-dark border-0 text-light"
                value={design.roomType}
                onChange={(e) => updateDesign({ roomType: e.target.value })}
              >
                <option>Living Room</option>
                <option>Bedroom</option>
                <option>Dining</option>
                <option>Office</option>
              </select>
            </div>
          </div>

          {/* Dimensions */}
          <div className="ew-panel p-3 mb-3">
            <div className="ew-section-title mb-2">Dimensions (m)</div>
            <div className="row g-2">
              <div className="col-4">
                <label className="form-label small text-secondary">
                  Length
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control form-control-sm bg-dark border-0 text-light"
                  value={design.room.length}
                  onChange={(e) =>
                    updateRoom({ length: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-4">
                <label className="form-label small text-secondary">
                  Width
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control form-control-sm bg-dark border-0 text-light"
                  value={design.room.width}
                  onChange={(e) =>
                    updateRoom({ width: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-4">
                <label className="form-label small text-secondary">
                  Height
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control form-control-sm bg-dark border-0 text-light"
                  value={design.room.height}
                  onChange={(e) =>
                    updateRoom({ height: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          {/* Colors with pickers */}
          <div className="ew-panel p-3 mb-3">
            <div className="ew-section-title mb-2">Colours</div>

            <div className="mb-3">
              <div className="small text-secondary mb-1">Wall</div>
              <HexColorPicker
                color={design.room.wallColor || "#2a1f1c"}
                onChange={(color) => updateRoom({ wallColor: color })}
              />
              <div className="small mt-1 text-secondary">
                {design.room.wallColor}
              </div>
            </div>

            <div>
              <div className="small text-secondary mb-1">Floor</div>
              <HexColorPicker
                color={design.room.floorColor || "#3b2316"}
                onChange={(color) => updateRoom({ floorColor: color })}
              />
              <div className="small mt-1 text-secondary">
                {design.room.floorColor}
              </div>
            </div>
          </div>

          {/* Catalogue from DB */}
          <div className="ew-panel p-3">
            <div className="d-flex justify-content-between mb-2 align-items-center">
              <div className="ew-section-title mb-0">Catalogue</div>
              <span
                className="material-icons-round text-secondary"
                style={{ fontSize: 18 }}
              >
                search
              </span>
            </div>
            <div className="d-flex flex-column gap-2">
              {furnitureCatalog.map((item) => (
                <div
                  key={item._id}
                  className="ew-list-tile px-2 py-2 d-flex align-items-center justify-content-between"
                  onClick={() => addFurnitureToRoom(item)}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="material-icons-round text-warning">weekend</span>
                    <div>
                      <div className="small">{item.name}</div>
                      <div
                        className="text-secondary"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <span
                    className="badge bg-dark border"
                    style={{ borderColor: "var(--ew-border)" }}
                  >
                    {item.dimensions?.width}×{item.dimensions?.depth}
                  </span>
                </div>
              ))}
              {furnitureCatalog.length === 0 && (
                <div className="text-secondary small">
                  No furniture found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER CANVAS */}
        <div className="col-5">
          <div className="d-flex justify-content-between mb-2">
            <div className="ew-section-title">2D layout</div>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-secondary border-0 text-secondary">
                <span className="material-icons-round" style={{ fontSize: 18 }}>
                  zoom_out
                </span>
              </button>
              <button className="btn btn-sm btn-outline-secondary border-0 text-secondary">
                <span className="material-icons-round" style={{ fontSize: 18 }}>
                  zoom_in
                </span>
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="ew-room-canvas"
            onMouseDown={() => setSelectedIndex(null)}
          >
            {/* Room shape */}
            <RoomRect
              wallColor={design.room.wallColor}
              floorColor={design.room.floorColor}
              dims={design.room}
            />

            {design.furniture.map((item, index) => {
              const leftPx = item.x * SCALE;
              const topPx = item.y * SCALE;

              return (
                <div
                  key={`${item.furnitureId}-${index}`}
                  className={
                    "ew-furniture-item" +
                    (index === selectedIndex ? " selected" : "")
                  }
                  style={{
                    left: leftPx,
                    top: topPx,
                    width: 70 * (item.scale || 1),
                    height: 70 * (item.scale || 1),
                    transform: `translate(-50%, -50%) rotate(${
                      item.rotation || 0
                    }deg)`,
                  }}
                  onMouseDown={(e) => beginDrag(e, index)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(index);
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: 28 }}>
                    weekend
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="col-4">
          <div className="ew-panel p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="ew-section-title">Live 3D view</div>
              <div className="small text-secondary">Coming soon</div>
            </div>
            <div
              className="rounded-3"
              style={{
                background: "#111",
                border: "1px solid var(--ew-border)",
                height: 180,
              }}
            />
          </div>

          <div className="ew-panel p-3">
            <div className="ew-section-title mb-2">Object inspector</div>
            {selectedItem ? (
              <>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <div className="small fw-semibold">
                      {
                        furnitureCatalog.find(
                          (f) => f._id === selectedItem.furnitureId
                        )?.name
                      }
                    </div>
                    <div
                      className="text-secondary"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {selectedItem.type}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary border-0 text-secondary"
                    onClick={() =>
                      updateFurnitureAt(selectedIndex, {
                        rotation: ((selectedItem.rotation || 0) + 45) % 360,
                      })
                    }
                  >
                    <span className="material-icons-round" style={{ fontSize: 18 }}>
                      rotate_right
                    </span>
                  </button>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small text-secondary">
                      Pos X (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm bg-dark border-0 text-light"
                      value={Number(selectedItem.x.toFixed(2))}
                      onChange={(e) =>
                        updateFurnitureAt(selectedIndex, {
                          x: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-secondary">
                      Pos Y (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm bg-dark border-0 text-light"
                      value={Number(selectedItem.y.toFixed(2))}
                      onChange={(e) =>
                        updateFurnitureAt(selectedIndex, {
                          y: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small text-secondary">
                      Rotation
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm bg-dark border-0 text-light"
                      value={selectedItem.rotation || 0}
                      onChange={(e) =>
                        updateFurnitureAt(selectedIndex, {
                          rotation: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-secondary">
                      Scale
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm bg-dark border-0 text-light"
                      value={selectedItem.scale || 1}
                      onChange={(e) =>
                        updateFurnitureAt(selectedIndex, {
                          scale: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  className="btn btn-sm w-100 btn-ew-danger text-light"
                  onClick={deleteSelected}
                >
                  <span
                    className="material-icons-round me-1"
                    style={{ fontSize: 18 }}
                  >
                    delete
                  </span>
                  Delete object
                </button>
              </>
            ) : (
              <div className="text-secondary small">
                Select a furniture item on the canvas to edit its properties.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomRect({ wallColor, floorColor, dims }) {
  const margin = 40;
  const length = dims.length || 1;
  const width = dims.width || 1;

  return (
    <div
      className="ew-room-rect"
      style={{
        left: margin,
        top: margin,
        right: margin,
        bottom: margin,
        background: `linear-gradient(to bottom, ${
          wallColor || "#2a1f1c"
        } 0 30%, ${floorColor || "#3b2316"} 30% 100%)`,
      }}
    >
      <div className="position-absolute top-0 start-0 p-2 small text-secondary">
        {length}m × {width}m
      </div>
    </div>
  );
}
