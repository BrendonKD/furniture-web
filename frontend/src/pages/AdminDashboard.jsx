import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

// ── Helpers ────────────────────────────────
const ICONS = [
  "weekend","king_bed","desk","bathtub","chair","light",
  "table_restaurant","living","bedroom_parent","stairs",
];

const STATUS_META = {
  inprogress: { label: "In Progress", cls: "badge-inprogress" },
  complete:   { label: "Complete",    cls: "badge-complete"   },
  pending:    { label: "Pending",     cls: "badge-pending"    },
  draft:      { label: "Draft",       cls: "badge-pending"    },
};

const STATUS_OPTIONS = [
  { value: "inprogress", label: "In Progress" },
  { value: "complete",   label: "Complete"    },
  { value: "pending",    label: "Pending"     },
  { value: "draft",      label: "Draft"       },
];

const initials = name =>
  name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";

const getOwnerName = (design) => {
  // ownerId is populated from backend: { _id, name, email }
  if (design.ownerId?.name)  return design.ownerId.name;
  if (design.ownerId?.email) return design.ownerId.email.split("@")[0];
  return "Unknown";
};

// ── Sidebar ────────────────────────────────
function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    ["token","user","role"].forEach(k => localStorage.removeItem(k));
    navigate("/login");
  };

  const navMain = [
    { icon: "dashboard",       label: "Dashboard",         to: "/admin",                active: true  },
    { icon: "design_services", label: "Design Sessions",   to: "/admin/create-session", active: false },
    { icon: "inventory_2",     label: "Furniture Library", to: "/admin/furniture",      active: false },
  ];
  const navMgmt = [
    { icon: "people",    label: "Customers" },
    { icon: "bar_chart", label: "Analytics" },
    { icon: "settings",  label: "Settings"  },
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">
          <span className="material-icons-round" style={{ color: "#c9922a" }}>chair</span>
        </div>
        <div>
          <div className="logo-brand">EVERWOOD & CO.</div>
          <div className="logo-sub">Admin Console</div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Overview</div>
        {navMain.map(({ icon, label, to, active }) => (
          <Link key={label} to={to} className={`nav-item${active ? " active" : ""}`}>
            <span className="material-icons-round">{icon}</span>{label}
          </Link>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Management</div>
        {navMgmt.map(({ icon, label }) => (
          <Link key={label} to="#" className="nav-item">
            <span className="material-icons-round">{icon}</span>{label}
          </Link>
        ))}
      </div>

      <div className="nav-section" style={{ marginTop: "auto" }}>
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <span className="material-icons-round">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ── Topbar ─────────────────────────────────
function Topbar({ search, onSearch }) {
  return (
    <header className="topbar">
      <span className="topbar-title">Administration Panel</span>
      <div className="d-flex align-items-center gap-2">
        <div className="search">
          <span className="material-icons-round">search</span>
          <input
            type="text"
            placeholder="Search designs…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
}

// ── Hero ───────────────────────────────────
function HeroBanner() {
  return (
    <div className="hero mb-4">
      <p className="hero-eyebrow mb-2">Admin Console · Everwood & Co.</p>
      <h1 className="mb-2">Welcome back 👋</h1>
      <p className="mb-4">
        Manage design sessions, browse the furniture catalogue, or start a new
        collaboration with a customer — all from one place.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Link to="/admin/create-session" className="btn btn-amber">
          <span className="material-icons-round">design_services</span>
          New Design Session
        </Link>
        <Link to="/admin/furniture" className="btn btn-outline">
          <span className="material-icons-round">inventory_2</span>
          Browse Furniture
        </Link>
        <Link to="/admin/add-furniture" className="btn btn-ghost">
          <span className="material-icons-round">add</span>
          Add Furniture
        </Link>
      </div>
    </div>
  );
}

// ── Stat Cards ─────────────────────────────
function StatCards({ total }) {
  const stats = [
    { icon: "folder_open",  label: "Total Designs",  value: total, delta: "↑ 4 this month",   mod: ""      },
    { icon: "timeline",     label: "This Week",       value: 18,    delta: "↑ 6 vs last week", mod: "blue"  },
    { icon: "check_circle", label: "Active Sessions", value: 42,    delta: "↑ 12% growth",     mod: "green" },
  ];
  return (
    <div className="stats mb-4">
      {stats.map(({ icon, label, value, delta, mod }) => (
        <div key={label} className={`stat-card ${mod}`}>
          <div className="stat-icon">
            <span className="material-icons-round">{icon}</span>
          </div>
          <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-delta">{delta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Status Dropdown ────────────────────────
function StatusDropdown({ design, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const meta = STATUS_META[design.status] ?? STATUS_META.inprogress;

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === design.status) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_BASE}/designs/${design._id}/status`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        alert(`Failed to update status (${res.status})`);
        return;
      }
      onStatusChange(design._id, newStatus);
    } catch (err) {
      console.error("Status update error:", err);
      alert("Server error while updating status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="status-dropdown-wrap">
      <span className={`badge ${meta.cls}`}>{meta.label}</span>
      <select
        className="status-select"
        value={design.status || "inprogress"}
        onChange={handleChange}
        disabled={updating}
        title="Change status"
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {updating && (
        <span
          className="material-icons-round"
          style={{ fontSize: 14, color: "var(--amber)", animation: "spin 1s linear infinite" }}
        >
          autorenew
        </span>
      )}
    </div>
  );
}

// ── Design Table ───────────────────────────
const FILTER_OPTIONS = ["All", "In Progress", "Complete", "Pending"];
const FILTER_MAP     = {
  "All":         null,
  "In Progress": "inprogress",
  "Complete":    "complete",
  "Pending":     "pending",
};
const PAGE_SIZE = 5;

function DesignTable({ designs, onDelete, onStatusChange }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [page,         setPage]         = useState(1);

  const filtered = activeFilter === "All"
    ? designs
    : designs.filter(d => d.status === FILTER_MAP[activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilter = label => { setActiveFilter(label); setPage(1); };

  return (
    <section>
      <div className="section-head mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="section-title">Design Library</span>
          <span className="count-pill">{filtered.length} designs</span>
        </div>
        <Link to="/admin/create-session" className="btn btn-amber btn-sm">
          <span className="material-icons-round">add</span>New Design
        </Link>
      </div>

      <div className="d-flex gap-2 mb-3">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt}
            className={`chip${activeFilter === opt ? " active" : ""}`}
            onClick={() => handleFilter(opt)}
          >{opt}</button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Room Name</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Last Modified</th>
              <th>Shape</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4" style={{ color: "var(--muted)" }}>
                  No designs found.
                </td>
              </tr>
            ) : paged.map((design, i) => {
              const idx      = (page - 1) * PAGE_SIZE + i;
              const icon     = ICONS[idx % ICONS.length];
              const owner    = getOwnerName(design);
              const dateStr  = design.updatedAt
                ? new Date(design.updatedAt).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })
                : "—";

              return (
                <tr key={design._id || idx}>
                  {/* Room name */}
                  <td>
                    <div className="room-cell">
                      <div className="room-thumb">
                        <span className="material-icons-round">{icon}</span>
                      </div>
                      <div>
                        <div className="room-name">{design.name || "Unnamed"}</div>
                        <div className="room-id">#RD-{1000 + idx}</div>
                      </div>
                    </div>
                  </td>
                  {/* Status — editable dropdown */}
                  <td>
                    <StatusDropdown
                      design={design}
                      onStatusChange={onStatusChange}
                    />
                  </td>
                  {/* Owner — real name from DB */}
                  <td>
                    <div className="owner">
                      <span>{owner}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td><span className="date">{dateStr}</span></td>

                  {/* Room shape */}
                  <td>
                    <span className="tag">
                      {design.roomShape || "Rectangle"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="actions">
                      <button
                        className="act danger"
                        title="Delete"
                        onClick={() => onDelete(design._id, design.name || "Unnamed")}
                      >
                        <span className="material-icons-round">delete</span>
                      </button>
                      <Link
                        to={`/admin/create-session?designId=${design._id}`}
                        className="act vibtn"
                        title="Open in Designer"
                      >
                        <span className="material-icons-round">edit</span>
                      </Link>
                      <Link
                        to={`/room-3d?designId=${design._id}`}
                        className="act vibtn"
                        title="3D View"
                      >
                        <span className="material-icons-round">view_in_ar</span>
                      </Link>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="pagination">
          <span className="page-info">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="d-flex gap-2">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: totalPages }, (_, k) => k + 1).map(p => (
              <button key={p} className={`page-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>›</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Root Component ─────────────────────────
const AdminDashboard = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(`${API_BASE}/designs/admin`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = res.ok ? await res.json() : [];
        setDesigns(data);
      } catch (err) {
        console.error("Admin fetch error:", err);
        setDesigns([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Delete design ──────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete design "${name}"?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_BASE}/designs/${id}`, {
        method:  "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) { alert(`Failed to delete (${res.status})`); return; }
      setDesigns(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Server error while deleting.");
    }
  };

  // ── Status change (optimistic UI update) ──
  const handleStatusChange = (id, newStatus) => {
    setDesigns(prev =>
      prev.map(d => d._id === id ? { ...d, status: newStatus } : d)
    );
  };

  const filtered = designs.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center vh-100 gap-2"
        style={{ background: "var(--bg)", color: "var(--muted)" }}
      >
        <span className="material-icons-round">autorenew</span>
        Loading admin panel…
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar search={search} onSearch={setSearch} />
        <div className="body">
          <HeroBanner />
          <StatCards total={designs.length} />
          <DesignTable
            designs={filtered}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;