import { useState, useEffect, useMemo } from "react";

const STATUS_META = {
  applied:     { label: "Applied",     color: "var(--blue-stamp)",  rot: -6 },
  interview:   { label: "Interview",   color: "var(--amber-stamp)", rot: 4  },
  offer:       { label: "Offer",       color: "var(--green-stamp)", rot: -3 },
  rejected:    { label: "Rejected",    color: "var(--red-stamp)",   rot: 7  },
  no_response: { label: "No Response", color: "var(--ink-soft)",    rot: -5 },
};

const SOURCE_LABEL = {
  cold_apply: "Cold Apply",
  linkedin: "LinkedIn",
  referral: "Referral",
  company_website: "Company Website",
  career_fair: "Career Fair",
};

const TEAM = ["Razan Froukh", "Shahd Shwekeyeh", "Taima Nazal", "Joud Thaher"];
const REPO_URL = "https://github.com/JHT127/my-first-mcp";
const REPO_LABEL = "JHT127/my-first-mcp";
const REPO_DESC = "A Model Context Protocol (MCP) server for tracking job applications — built with TypeScript, Zod, and the MCP SDK.";

const SEED = [
  { id: "app-001", company: "Exalt Technologies", role: "Software Engineer Intern", date_applied: "2026-07-01", status: "interview", source: "cold_apply", notes: "Waiting for response" },
  { id: "app-002", company: "Orion VLSI Technologies", role: "Verification Engineer Intern", date_applied: "2026-06-20", status: "interview", source: "linkedin", notes: "Interview scheduled" },
  { id: "app-003", company: "Google", role: "Frontend Developer", date_applied: "2026-08-18", status: "applied", source: "linkedin", notes: "" },
  { id: "app-004", company: "Google", role: "Backend Developer", date_applied: "2026-08-19", status: "applied", source: "linkedin", notes: "" },
];

const STORE_KEY = "job-applications-en";
const FOLLOW_UP_DAYS = { applied: 14, interview: 7, no_response: 14 };

function daysSince(dateStr, now) {
  const date = new Date(dateStr);
  const dateDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - dateDay) / (1000 * 60 * 60 * 24));
}

function withApplicationHistory(app) {
  const updatedAt = app.updated_at || `${app.date_applied}T00:00:00.000Z`;
  return {
    ...app,
    updated_at: updatedAt,
    history: app.history || [{ status: app.status, timestamp: updatedAt }],
  };
}

function needsFollowUp(app, now) {
  const threshold = FOLLOW_UP_DAYS[app.status];
  return threshold !== undefined && daysSince(app.updated_at || app.date_applied, now) >= threshold;
}

function FolderCard({ app, onOpen, now }) {
  const meta = STATUS_META[app.status] || STATUS_META.applied;
  const stale = needsFollowUp(app, now());
  return (
    <button className="folder-card" onClick={() => onOpen(app)}>
      <div className="folder-tab">{app.id}</div>
      <div className="folder-body">
        <div className="folder-role">{app.role}</div>
        <div className="folder-company">{app.company}</div>
        <div className="folder-meta">
          <span>{app.date_applied}</span>
          <span className="dot">·</span>
          <span>{SOURCE_LABEL[app.source] || app.source}</span>
        </div>
        {stale && <div className="stale-flag">Needs follow-up · {daysSince(app.updated_at || app.date_applied, now())}d</div>}
      </div>
      <div className="stamp" style={{ "--stamp-color": meta.color, "--stamp-rot": `${meta.rot}deg` }}>
        {meta.label}
      </div>
    </button>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function JobTrackerDashboard({ now = () => new Date() } = {}) {
  const [apps, setApps] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const currentDate = now();

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORE_KEY);
        const stored = res ? JSON.parse(res.value) : SEED;
        setApps(stored.map(withApplicationHistory));
      } catch {
        setApps(SEED.map(withApplicationHistory));
      }
    })();
  }, []);

  const persist = async (next) => {
    setApps(next);
    try {
      await window.storage.set(STORE_KEY, JSON.stringify(next));
    } catch {
      // local state still updated; storage write failed silently
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const filtered = useMemo(() => {
    if (!apps) return [];
    if (filter === "all") return apps;
    return apps.filter((a) => a.status === filter);
  }, [apps, filter]);

  const staleCount = useMemo(() => {
    if (!apps) return 0;
    return apps.filter((app) => needsFollowUp(app, currentDate)).length;
  }, [apps, currentDate]);

  const counts = useMemo(() => {
    const c = { all: apps?.length || 0 };
    Object.keys(STATUS_META).forEach((k) => (c[k] = 0));
    apps?.forEach((a) => (c[a.status] = (c[a.status] || 0) + 1));
    return c;
  }, [apps]);

  const updateStatus = async (id, newStatus) => {
    const timestamp = now().toISOString();
    const next = apps.map((app) => {
      if (app.id !== id) return app;
      const history = app.history || withApplicationHistory(app).history;
      return {
        ...app,
        status: newStatus,
        updated_at: timestamp,
        history:
          app.status === newStatus
            ? history
            : [...history, { status: newStatus, timestamp }],
      };
    });
    await persist(next);
    setSelected((selectedApp) =>
      selectedApp ? next.find((app) => app.id === selectedApp.id) || selectedApp : selectedApp,
    );
    showToast("Status updated");
  };

  const addApplication = async (form) => {
    setSaving(true);
    const id = "app-" + String((apps.length + 1)).padStart(3, "0") + "-" + Math.random().toString(36).slice(2, 5);
    const timestamp = now().toISOString();
    const application = withApplicationHistory({
      id,
      ...form,
      updated_at: timestamp,
      priority: form.priority || "normal",
      tags: form.tags || [],
      history: [{ status: form.status, timestamp }],
    });
    const next = [application, ...apps];
    await persist(next);
    setSaving(false);
    setAdding(false);
    showToast("Application added");
  };

  if (!apps) {
    return (
      <div className="jt-root">
        <Style />
        <div className="loading">Opening the archive…</div>
      </div>
    );
  }

  const tabs = [
    { key: "all", label: "All" },
    { key: "applied", label: STATUS_META.applied.label },
    { key: "interview", label: STATUS_META.interview.label },
    { key: "offer", label: STATUS_META.offer.label },
    { key: "rejected", label: STATUS_META.rejected.label },
    { key: "no_response", label: STATUS_META.no_response.label },
  ];

  return (
    <div className="jt-root" dir="ltr">
      <Style />

      <header className="jt-header">
        <div>
          <div className="eyebrow">APPLICATION ARCHIVE · {currentDate.toISOString().slice(0, 10)}</div>
          <h1>Job Application Tracker</h1>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>+ New Application</button>
      </header>

      {staleCount > 0 && (
        <div className="alert-strip">
          {staleCount} {staleCount === 1 ? "application" : "applications"} need follow-up (no response for 14+ days)
        </div>
      )}

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={"tab" + (filter === t.key ? " tab-active" : "")}
            onClick={() => setFilter(t.key)}
          >
            {t.label} <span className="tab-count">{counts[t.key] || 0}</span>
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <div className="empty">No applications in this category yet.</div>
      ) : (
        <div className="grid">
          {filtered.map((app) => (
            <FolderCard key={app.id} app={app} onOpen={setSelected} now={now} />
          ))}
        </div>
      )}

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <div className="detail-head">
            <div className="folder-tab">{selected.id}</div>
            <button className="close-x" onClick={() => setSelected(null)}>×</button>
          </div>
          <h2>{selected.role}</h2>
          <div className="detail-company">{selected.company}</div>
          <div className="detail-row"><span>Date applied</span><span>{selected.date_applied}</span></div>
          <div className="detail-row"><span>Source</span><span>{SOURCE_LABEL[selected.source] || selected.source}</span></div>
          {selected.notes && <div className="detail-notes">{selected.notes}</div>}

          <div className="status-picker">
            <div className="status-picker-label">Update status</div>
            <div className="status-options">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button
                  key={key}
                  className={"status-opt" + (selected.status === key ? " status-opt-active" : "")}
                  style={{ "--stamp-color": meta.color }}
                  onClick={() => updateStatus(selected.id, key)}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {adding && (
        <Modal onClose={() => !saving && setAdding(false)}>
          <AddForm onCancel={() => setAdding(false)} onSubmit={addApplication} saving={saving} now={now} />
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}

      <footer className="jt-footer">
        <div className="footer-row">
          <div className="footer-block">
            <div className="footer-label">Team</div>
            <div className="footer-team">
              {TEAM.map((name) => (
                <span key={name} className="team-chip">{name}</span>
              ))}
            </div>
          </div>
          <div className="footer-block footer-repo">
            <div className="footer-label">Repository</div>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="repo-link">
              <span className="repo-name">{REPO_LABEL}</span>
              <span className="repo-arrow">↗</span>
            </a>
            <div className="repo-desc">{REPO_DESC}</div>
          </div>
        </div>
        <div className="disclaimer">
          This is a standalone dashboard — edits here are saved locally in the browser and are not synced automatically with the live my-first-mcp server.
        </div>
      </footer>
    </div>
  );
}

function AddForm({ onCancel, onSubmit, saving, now }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState(() => now().toISOString().slice(0, 10));
  const [source, setSource] = useState("cold_apply");
  const [status, setStatus] = useState("applied");
  const [notes, setNotes] = useState("");

  const canSubmit = company.trim() && role.trim() && date;

  return (
    <form
      className="add-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ company: company.trim(), role: role.trim(), date_applied: date, source, status, notes: notes.trim() });
      }}
    >
      <h2>New Application</h2>

      <label>Company
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google" required />
      </label>

      <label>Role
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Developer" required />
      </label>

      <div className="form-row">
        <label>Date applied
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>Source
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <label>Current status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </label>

      <label>Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" />
      </label>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!canSubmit || saving}>
          {saving ? "Saving…" : "Save application"}
        </button>
      </div>
    </form>
  );
}

function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

      .jt-root {
        --paper: #F2E9D8;
        --paper-dark: #E4D6BC;
        --card: #FBF7EE;
        --ink: #20303F;
        --ink-soft: #5B6B7A;
        --line: rgba(32,48,63,0.16);
        --red-stamp: #A63D3D;
        --green-stamp: #4F7A5C;
        --amber-stamp: #B8823A;
        --blue-stamp: #3B5C7E;

        background: var(--paper);
        background-image:
          radial-gradient(circle at 1px 1px, rgba(32,48,63,0.05) 1px, transparent 0);
        background-size: 18px 18px;
        color: var(--ink);
        font-family: 'Inter', sans-serif;
        border-radius: 16px;
        padding: 28px;
        max-width: 100%;
        box-sizing: border-box;
        position: relative;
      }
      .jt-root * { box-sizing: border-box; }

      .loading { font-family: 'Fraunces', serif; font-weight: 700; padding: 40px; text-align: center; color: var(--ink-soft); }

      .jt-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 2px solid var(--ink);
        padding-bottom: 16px;
        margin-bottom: 18px;
        flex-wrap: wrap;
      }
      .eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--ink-soft);
        margin-bottom: 6px;
      }
      .jt-header h1 {
        font-family: 'Fraunces', serif;
        font-weight: 800;
        font-size: 32px;
        margin: 0;
        letter-spacing: -0.01em;
      }

      .btn-primary {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        background: var(--ink);
        color: var(--paper);
        border: none;
        border-radius: 8px;
        padding: 11px 20px;
        cursor: pointer;
        font-size: 14px;
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .btn-primary:hover { transform: translateY(-1px); background: #16222E; }
      .btn-primary:disabled { opacity: 0.5; cursor: default; transform: none; }

      .btn-ghost {
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        background: transparent;
        color: var(--ink-soft);
        border: 1.5px solid var(--line);
        border-radius: 8px;
        padding: 10px 18px;
        cursor: pointer;
        font-size: 14px;
      }
      .btn-ghost:hover { border-color: var(--ink-soft); }

      .alert-strip {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12.5px;
        background: #F3E3C9;
        border: 1px solid var(--amber-stamp);
        color: #7A551F;
        border-radius: 8px;
        padding: 9px 14px;
        margin-bottom: 16px;
      }

      .tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .tab {
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        font-size: 13px;
        background: var(--paper-dark);
        border: 1px solid transparent;
        color: var(--ink-soft);
        padding: 7px 14px;
        border-radius: 999px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tab-active { background: var(--ink); color: var(--paper); }
      .tab-count { font-family: 'JetBrains Mono', monospace; font-size: 11px; opacity: 0.75; }

      .empty {
        text-align: center;
        color: var(--ink-soft);
        padding: 50px 20px;
        font-size: 14px;
        border: 1.5px dashed var(--line);
        border-radius: 12px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 16px;
      }

      .folder-card {
        text-align: left;
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 12px 4px 12px 12px;
        padding: 18px 16px 16px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        box-shadow: 0 1px 0 var(--line);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        font-family: inherit;
      }
      .folder-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 18px rgba(32,48,63,0.12);
      }
      .folder-tab {
        position: absolute;
        top: 0;
        right: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        color: var(--paper);
        background: var(--ink);
        padding: 3px 9px;
        border-radius: 0 0 0 8px;
        letter-spacing: 0.03em;
      }
      .folder-role {
        font-family: 'Fraunces', serif;
        font-weight: 700;
        font-size: 16px;
        margin-top: 14px;
      }
      .folder-company {
        font-size: 13.5px;
        color: var(--ink-soft);
        margin-top: 2px;
      }
      .folder-meta {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        color: var(--ink-soft);
        margin-top: 10px;
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .dot { opacity: 0.5; }
      .stale-flag {
        margin-top: 8px;
        font-size: 11px;
        color: var(--red-stamp);
        font-weight: 600;
      }

      .stamp {
        margin-top: 14px;
        display: inline-block;
        font-family: 'Inter', sans-serif;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.04em;
        color: var(--stamp-color);
        border: 2px solid var(--stamp-color);
        border-radius: 6px;
        padding: 3px 10px;
        transform: rotate(var(--stamp-rot));
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(32,48,63,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        padding: 20px;
      }
      .modal-sheet {
        background: var(--card);
        border-radius: 14px;
        padding: 22px 24px 24px;
        width: 100%;
        max-width: 380px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 50px rgba(0,0,0,0.25);
      }

      .detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .detail-head .folder-tab { position: static; }
      .close-x {
        background: none; border: none; font-size: 22px; line-height: 1; cursor: pointer; color: var(--ink-soft);
      }
      .modal-sheet h2 {
        font-family: 'Fraunces', serif;
        font-weight: 800;
        font-size: 20px;
        margin: 4px 0 2px;
      }
      .detail-company { color: var(--ink-soft); font-size: 14px; margin-bottom: 14px; }
      .detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        padding: 8px 0;
        border-top: 1px solid var(--line);
        color: var(--ink-soft);
      }
      .detail-row span:last-child { color: var(--ink); font-family: 'JetBrains Mono', monospace; font-size: 12px; }
      .detail-notes {
        margin-top: 10px;
        font-size: 13px;
        background: var(--paper-dark);
        border-radius: 8px;
        padding: 10px 12px;
        color: var(--ink);
      }

      .status-picker { margin-top: 18px; }
      .status-picker-label { font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; font-weight: 600; }
      .status-options { display: flex; flex-wrap: wrap; gap: 6px; }
      .status-opt {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        font-size: 12px;
        background: transparent;
        border: 1.5px solid var(--stamp-color);
        color: var(--stamp-color);
        border-radius: 6px;
        padding: 6px 10px;
        cursor: pointer;
      }
      .status-opt-active { background: var(--stamp-color); color: var(--card); }

      .add-form { display: flex; flex-direction: column; gap: 12px; }
      .add-form h2 { font-family: 'Fraunces', serif; font-weight: 800; font-size: 19px; margin: 0 0 4px; }
      .add-form label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--ink-soft); font-weight: 600; }
      .add-form input, .add-form select, .add-form textarea {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        color: var(--ink);
        background: var(--paper);
        border: 1.5px solid var(--line);
        border-radius: 8px;
        padding: 9px 10px;
        outline: none;
        resize: vertical;
      }
      .add-form input:focus, .add-form select:focus, .add-form textarea:focus { border-color: var(--ink); }
      .form-row { display: flex; gap: 10px; }
      .form-row label { flex: 1; }
      .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }

      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--ink);
        color: var(--paper);
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        font-size: 13px;
        padding: 10px 18px;
        border-radius: 8px;
        z-index: 60;
      }

      .jt-footer {
        margin-top: 26px;
        border-top: 1px dashed var(--line);
        padding-top: 16px;
      }
      .footer-row {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }
      .footer-block { flex: 1; min-width: 200px; }
      .footer-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--ink-soft);
        margin-bottom: 8px;
      }
      .footer-team { display: flex; flex-wrap: wrap; gap: 6px; }
      .team-chip {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 500;
        background: var(--paper-dark);
        border-radius: 999px;
        padding: 5px 12px;
        color: var(--ink);
      }
      .repo-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
        text-decoration: none;
        border-bottom: 1.5px solid var(--ink);
        padding-bottom: 1px;
      }
      .repo-link:hover { color: var(--amber-stamp); border-color: var(--amber-stamp); }
      .repo-arrow { font-size: 13px; }
      .repo-desc {
        font-size: 12px;
        color: var(--ink-soft);
        margin-top: 6px;
        line-height: 1.5;
        max-width: 340px;
      }

      .disclaimer {
        margin-top: 16px;
        font-size: 11px;
        color: var(--ink-soft);
        text-align: center;
      }

      @media (max-width: 480px) {
        .jt-root { padding: 18px; }
        .jt-header h1 { font-size: 24px; }
        .grid { grid-template-columns: 1fr 1fr; gap: 10px; }
        .footer-row { flex-direction: column; gap: 16px; }
      }
    `}</style>
  );
}
