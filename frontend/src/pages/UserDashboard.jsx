import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import "./UserDashboard.css";

const PAGE_SIZE = 6;

const ROOM_ICONS = {
  "Living Room": "weekend", Bedroom: "king_bed",
  Dining: "table_restaurant", Office: "desk", Kitchen: "kitchen",
};

const STATUS = {
  draft:    { label: "Draft",     cls: "draft"    },
  complete: { label: "Complete",  cls: "complete" },
  review:   { label: "In Review", cls: "review"   },
};

export default function UserDashboard() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = userData?.name || userData?.username || "Guest";

  const [designs,    setDesigns]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [roomFilter, setRoomFilter] = useState("All");
  const [sortBy,     setSortBy]     = useState("recent");
  const [page,       setPage]       = useState(1);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    api.get("/designs")
      .then(r => setDesigns(Array.isArray(r.data) ? r.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/designs/${id}`);
      setDesigns(p => p.filter(d => d._id !== id));
    } catch { alert("Failed to delete."); }
  };

  const handleLogout = () => {
    ["token","user","role"].forEach(k => localStorage.removeItem(k));
    navigate("/login");
  };

  const filtered = designs
    .filter(d =>
      d.name?.toLowerCase().includes(search.toLowerCase()) &&
      (roomFilter === "All" || d.roomType === roomFilter)
    )
    .sort((a, b) => sortBy === "name"
      ? a.name.localeCompare(b.name)
      : new Date(b.updatedAt) - new Date(a.updatedAt)
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="ud-loading d-flex align-items-center justify-content-center vh-100 gap-2">
        <span className="material-icons-round" style={{ animation: "ud-spin 1.2s linear infinite", color: "var(--ud-amber)" }}>autorenew</span>
        Loading your workspace…
      </div>
    );
  }

  return (
    <div className="ud-page">

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="ud-header d-flex align-items-center justify-content-between px-4">
        <div className="d-flex align-items-center gap-3">
          <Link to="/" className="ud-logo d-flex align-items-center gap-2 text-decoration-none">
            <div className="ud-logo-icon d-flex align-items-center justify-content-center">
              <span className="material-icons-round" style={{ fontSize: 17 }}>chair</span>
            </div>
            <span className="ud-brand">Everwood <span style={{ color: "var(--ud-muted)" }}>&</span> Co.</span>
          </Link>
          <nav className="d-none d-md-flex gap-1">
            <Link to="/dashboard"    className="ud-nav-link active">Dashboard</Link>
            <Link to="/room-designer" className="ud-nav-link">New Design</Link>
          </nav>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="text-end d-none d-sm-block">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 10, color: "var(--ud-amber)", textTransform: "uppercase", letterSpacing: ".06em" }}>Pro Member</div>
          </div>
          <img
            className="ud-avatar"
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2a1f14&color=e3b566&size=64`}
            alt={userName}
          />
          <button className="ud-btn-logout d-flex align-items-center gap-1 px-3 py-1" onClick={handleLogout}>
            <span className="material-icons-round" style={{ fontSize: 15 }}>logout</span>
            Logout
          </button>
        </div>
      </header>

      <div className="ud-body">

        {/* ── HERO ───────────────────────────────────── */}
        <div className="ud-hero mb-4 p-5 position-relative">
          <div className="ud-hero-glow" />
          <div className="position-relative" style={{ zIndex: 2, maxWidth: 580 }}>
            <div className="ud-eyebrow mb-3">
              <span className="material-icons-round" style={{ fontSize: 13 }}>star</span>
              Member Workspace
            </div>
            <h1 className="ud-hero-title mb-3">
              Welcome back,<br /><span>{userName.split(" ")[0]}</span>
            </h1>
            <p style={{ color: "var(--ud-muted)", fontSize: 14, lineHeight: 1.75, marginBottom: 24 }}>
              Your artisanal room designs are waiting. Pick up where you left off or start something new.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <button className="ud-btn-amber d-flex align-items-center gap-2 px-4 py-2" onClick={() => navigate("/room-designer")}>
                <span className="material-icons-round" style={{ fontSize: 17 }}>add_circle</span>
                New Room Design
              </button>
              <button
                className="ud-btn ud-btn-ghost d-flex align-items-center gap-2 px-4 py-2"
                onClick={() => navigate("/browse-furniture")}
              >
                <span className="material-icons-round" style={{ fontSize: 17 }}>inventory_2</span>
                Browse Furniture
              </button>

            </div>
          </div>
        </div>

        {/* ── STATS ──────────────────────────────────── */}
        <div className="row g-3 mb-4 align-items-stretch">
          {[
            { icon: "folder_open",  label: "Total Designs",   val: designs.length,                                cls: "",      sub: "all projects" },
            { icon: "history",      label: "Recently Opened",  val: designs[0]?.name || "—",                      cls: "blue",  sub: "last modified", small: true },
            { icon: "edit_note",    label: "Draft Designs",    val: designs.filter(d => d.status === "draft").length, cls: "green", sub: "in progress" },
          ].map(({ icon, label, val, cls, sub, small }) => (
            <div key={label} className="col-12 col-md-4">
              <div className={`ud-stat p-4 d-flex align-items-center gap-3 h-100 ${cls}`}>
                <div className="ud-stat-icon">
                  <span className="material-icons-round">{icon}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ud-muted)", marginBottom: 4 }}>{label}</div>
                  <div className={small ? "" : "ud-stat-val"} style={small ? { fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : {}}>
                    {val}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ud-muted)", marginTop: 3 }}>{sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── DESIGNS TABLE ──────────────────────────── */}
        <section id="designs">
          {/* Section head */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <span style={{ fontFamily: "helvetica", fontSize: 20, fontWeight: 700 }}>My Saved Designs</span>
              <div style={{ fontSize: 12, color: "var(--ud-muted)", marginTop: 3 }}>
                {filtered.length} design{filtered.length !== 1 ? "s" : ""} · manage and continue your projects
              </div>
            </div>
            <button className="ud-btn-amber d-flex align-items-center gap-1 px-3 py-2" style={{ fontSize: 12 }} onClick={() => navigate("/room-designer")}>
              <span className="material-icons-round" style={{ fontSize: 15 }}>add</span>New Design
            </button>
          </div>

          {/* Filters */}
          <div className="d-flex gap-2 flex-wrap mb-3">
            <div className="ud-search d-flex align-items-center gap-2 px-3 py-2 flex-grow-1">
              <span className="material-icons-round" style={{ fontSize: 17, color: "var(--ud-muted)" }}>search</span>
              <input placeholder="Search designs…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="ud-select" value={roomFilter} onChange={e => { setRoomFilter(e.target.value); setPage(1); }}>
              <option value="All">All Rooms</option>
              {["Living Room","Bedroom","Dining","Office","Kitchen"].map(r => <option key={r}>{r}</option>)}
            </select>
            <select className="ud-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="recent">Recently Modified</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>

          {/* Table */}
          <div className="ud-table-wrap">
            <table className="ud-table">
              <thead>
                <tr>
                  <th>Design Name</th>
                  <th>Room Type</th>
                  <th>Status</th>
                  <th>Last Modified</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="text-center py-5" style={{ color: "var(--ud-muted)" }}>
                      <span className="material-icons-round d-block mb-2" style={{ fontSize: 40 }}>design_services</span>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>No designs found</div>
                      <div style={{ fontSize: 12, marginBottom: 16 }}>
                        {search || roomFilter !== "All" ? "Try adjusting your filters." : "Start your first room design."}
                      </div>
                      {!search && roomFilter === "All" && (
                        <button className="ud-btn-amber d-inline-flex align-items-center gap-1 px-3 py-2" style={{ fontSize: 12 }} onClick={() => navigate("/room-designer")}>
                          <span className="material-icons-round" style={{ fontSize: 15 }}>add</span>Create First Design
                        </button>
                      )}
                    </div>
                  </td></tr>
                ) : paged.map((design, i) => {
                  const idx    = (page - 1) * PAGE_SIZE + i;
                  const status = STATUS[design.status] || STATUS.draft;
                  const date   = design.updatedAt
                    ? new Date(design.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—";

                  return (
                    <tr key={design._id || idx}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="ud-thumb" style={design.image ? { backgroundImage: `url(${design.image})` } : {}}>
                            {!design.image && <span className="material-icons-round">{ROOM_ICONS[design.roomType] || "home"}</span>}
                          </div>
                          <div>
                            <div className="ud-design-name">{design.name || "Untitled"}</div>
                            <div className="ud-design-id">#DS-{String(idx + 1).padStart(3, "0")}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="ud-room-badge">{design.roomType || "—"}</span></td>
                      <td><span className={`ud-status ${status.cls}`}>{status.label}</span></td>
                      <td style={{ fontSize: 12, color: "var(--ud-muted)" }}>{date}</td>
                      <td>
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          <Link to={`/room-designer?designId=${design._id}`} className="ud-act" title="Edit">
                            <span className="material-icons-round">edit</span>
                          </Link>
                          <Link to={`/room-3d?designId=${design._id}`} className="ud-act v3d" title="3D View">
                            <span className="material-icons-round">view_in_ar</span>
                          </Link>
                          <button className="ud-act del" title="Delete" onClick={() => handleDelete(design._id, design.name)}>
                            <span className="material-icons-round">delete_outline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ borderTop: "1px solid var(--ud-border)" }}>
              <span style={{ fontSize: 12, color: "var(--ud-muted)" }}>
                {filtered.length === 0 ? "No results" : `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <div className="d-flex gap-1">
                <button className="ud-page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
                {Array.from({ length: totalPages }, (_,k) => k+1).map(p => (
                  <button key={p} className={`ud-page-btn${page===p?" active":""}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="ud-page-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages}>›</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="d-flex align-items-center justify-content-between flex-wrap gap-2 px-4 py-4 mt-5"
        style={{ borderTop: "1px solid var(--ud-border)" }}>
        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: "var(--ud-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>
          <span className="material-icons-round" style={{ fontSize: 16, color: "var(--ud-amber)" }}>chair</span>
          Everwood & Co.
        </div>
        <span style={{ fontSize: 11, color: "var(--ud-muted)" }}>© 2026 Everwood,  PUSL3122 HCI, Group 04</span>
      </footer>

    </div>
  );
}