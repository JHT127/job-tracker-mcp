import React, { useEffect, useMemo, useState } from "react";

const STATUS_META = {
  applied: { label: "Applied", color: "#3B5C7E" },
  interview: { label: "Interview", color: "#B8823A" },
  offer: { label: "Offer", color: "#4F7A5C" },
  rejected: { label: "Rejected", color: "#A63D3D" },
  no_response: { label: "No Response", color: "#5B6B7A" },
};

const SOURCE_LABEL = {
  cold_apply: "Cold Apply",
  linkedin: "LinkedIn",
  referral: "Referral",
  company_website: "Company Website",
  career_fair: "Career Fair",
};

const DEMO_APPS = [
  {
    id: "app-001",
    company: "Exalt Technologies",
    role: "Software Engineer Intern",
    date_applied: "2026-07-01",
    status: "interview",
    source: "cold_apply",
    notes: "Waiting for response",
    updated_at: "2026-08-01T00:00:00.000Z",
    history: [
      { status: "applied", timestamp: "2026-07-01T00:00:00.000Z" },
      { status: "interview", timestamp: "2026-08-01T00:00:00.000Z" },
    ],
  },
  {
    id: "app-002",
    company: "Orion VLSI",
    role: "Verification Engineer Intern",
    date_applied: "2026-06-20",
    status: "applied",
    source: "linkedin",
    notes: "Follow-up scheduled",
    updated_at: "2026-08-14T00:00:00.000Z",
    history: [{ status: "applied", timestamp: "2026-06-20T00:00:00.000Z" }],
  },
  {
    id: "app-003",
    company: "Google",
    role: "Frontend Developer",
    date_applied: "2026-08-18",
    status: "offer",
    source: "linkedin",
    notes: "Offer received",
    updated_at: "2026-08-19T00:00:00.000Z",
    history: [
      { status: "applied", timestamp: "2026-08-18T00:00:00.000Z" },
      { status: "offer", timestamp: "2026-08-19T00:00:00.000Z" },
    ],
  },
];

const DEMO_CONTACTS = [
  {
    id: "con-001",
    person: "Maya Hassan",
    company: "Exalt Technologies",
    last_message_date: "2026-08-10",
    notes: "Recruiter",
  },
  {
    id: "con-002",
    person: "Omar Nassar",
    company: "Google",
    last_message_date: "2026-06-30",
    notes: "Hiring manager",
  },
];

const PREF_KEY = "job-tracker-dashboard-preferences";
const defaultPreferences = { theme: "light", lang: "en" };

function getSavedPreferences() {
  try {
    const value = localStorage.getItem(PREF_KEY);
    return value
      ? { ...defaultPreferences, ...JSON.parse(value) }
      : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function readJsonResponse(response) {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json();
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function shouldFollowUp(application, now) {
  const threshold = { applied: 14, interview: 7, no_response: 14 }[
    application.status
  ];
  if (!threshold) return false;
  const lastUpdated = new Date(
    application.updated_at ?? application.date_applied,
  );
  const diffDays = Math.floor(
    (now.getTime() - lastUpdated.getTime()) / 86_400_000,
  );
  return diffDays >= threshold;
}

function App() {
  const [preferences, setPreferences] = useState(() => getSavedPreferences());
  const [apps, setApps] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedView, setSelectedView] = useState("board");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(
    import.meta.env.VITE_DEMO === "true",
  );

  const now = new Date();
  const strings = {
    en: {
      title: "Job Application Tracker",
      board: "Board",
      timeline: "Timeline",
      contacts: "Contacts",
      search: "Search by company or role",
      overview: "Overview",
      connectClaude: "Connect Claude",
      repo: "Repository",
      darkMode: "Dark mode",
      language: "Language",
      demoMode: "Demo mode",
      loading: "Loading applications…",
      noResults: "No applications match your filters.",
      apis: "Connect to API",
      summary: "Pipeline summary",
      followUps: "Follow-up items",
      interviews: "Upcoming interviews",
    },
    ar: {
      title: "متتبع طلبات العمل",
      board: "اللوحة",
      timeline: "الجدول الزمني",
      contacts: "جهات الاتصال",
      search: "ابحث حسب الشركة أو الدور",
      overview: "نظرة عامة",
      connectClaude: "ربط كلود",
      repo: "المستودع",
      darkMode: "الوضع الداكن",
      language: "اللغة",
      demoMode: "وضع العرض",
      loading: "جارٍ تحميل الطلبات…",
      noResults: "لا توجد طلبات تطابق المرشحات.",
      apis: "الاتصال بالواجهة",
      summary: "ملخص الخط الأنبوبي",
      followUps: "عناصر المتابعة",
      interviews: "المقابلات القادمة",
    },
  };

  const labels = strings[preferences.lang] ?? strings.en;

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
    document.documentElement.setAttribute("data-theme", preferences.theme);
    document.documentElement.lang = preferences.lang;
    document.documentElement.dir = preferences.lang === "ar" ? "rtl" : "ltr";
  }, [preferences]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      if (import.meta.env.VITE_DEMO === "true" || demoMode) {
        setApps(DEMO_APPS);
        setContacts(DEMO_CONTACTS);
        setLoading(false);
        return;
      }

      const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";
      try {
        const apiKey = import.meta.env.VITE_API_KEY;
        const [appsResponse, contactsResponse] = await Promise.all([
          fetch(`${apiBase}/applications`, {
            headers: apiKey ? { "X-API-Key": apiKey } : undefined,
          }),
          fetch(`${apiBase}/contacts`, {
            headers: apiKey ? { "X-API-Key": apiKey } : undefined,
          }),
        ]);

        const nextApps = await readJsonResponse(appsResponse);
        const nextContacts = await readJsonResponse(contactsResponse);

        if (isMounted) {
          setApps(
            Array.isArray(nextApps.applications)
              ? nextApps.applications
              : nextApps,
          );
          setContacts(
            Array.isArray(nextContacts.contacts)
              ? nextContacts.contacts
              : nextContacts,
          );
        }
      } catch (loadError) {
        if (isMounted) {
          setDemoMode(true);
          setApps(DEMO_APPS);
          setContacts(DEMO_CONTACTS);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to reach the API. Showing demo data.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [demoMode]);

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return apps.filter((application) => {
      const matchesStatus =
        statusFilter === "all" || application.status === statusFilter;
      const matchesSearch =
        !query ||
        application.company.toLowerCase().includes(query) ||
        application.role.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [apps, search, statusFilter]);

  const statusCounts = useMemo(() => {
    return Object.keys(STATUS_META).reduce(
      (counts, key) => {
        counts[key] = apps.filter((app) => app.status === key).length;
        return counts;
      },
      { all: apps.length },
    );
  }, [apps]);

  const boardColumns = Object.keys(STATUS_META);

  return (
    <div className="dashboard-shell">
      <style>{styles}</style>
      <header className="topbar">
        <div>
          <p className="eyebrow">JOB TRACKER</p>
          <h1>{labels.title}</h1>
        </div>
        <div className="toolbar" aria-label="Dashboard controls">
          <label className="search" aria-label={labels.search}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.search}
            />
          </label>
          <button
            className="chip-button"
            onClick={() =>
              setPreferences((current) => ({
                ...current,
                theme: current.theme === "light" ? "dark" : "light",
              }))
            }
            aria-pressed={preferences.theme === "dark"}
          >
            {labels.darkMode}
          </button>
          <button
            className="chip-button"
            onClick={() =>
              setPreferences((current) => ({
                ...current,
                lang: current.lang === "en" ? "ar" : "en",
              }))
            }
            aria-pressed={preferences.lang === "ar"}
          >
            {labels.language}
          </button>
          <button
            className="chip-button"
            onClick={() => setDemoMode((current) => !current)}
            aria-pressed={demoMode}
          >
            {labels.demoMode}
          </button>
        </div>
      </header>

      <section className="overview-grid" aria-label={labels.summary}>
        <SummaryCard
          title={labels.summary}
          value={String(apps.length)}
          hint="applications"
        />
        <SummaryCard
          title={labels.followUps}
          value={String(apps.filter((app) => shouldFollowUp(app, now)).length)}
          hint="need attention"
        />
        <SummaryCard
          title={labels.interviews}
          value={String(
            apps.filter((app) => app.status === "interview").length,
          )}
          hint="in progress"
        />
      </section>

      <section className="filters" aria-label="Status filters">
        <button
          className={statusFilter === "all" ? "filter active" : "filter"}
          onClick={() => setStatusFilter("all")}
          aria-pressed={statusFilter === "all"}
        >
          All ({statusCounts.all})
        </button>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button
            key={key}
            className={statusFilter === key ? "filter active" : "filter"}
            onClick={() => setStatusFilter(key)}
            aria-pressed={statusFilter === key}
          >
            {meta.label} ({statusCounts[key] ?? 0})
          </button>
        ))}
      </section>

      <section className="view-tabs" aria-label="Dashboard views">
        {["board", "timeline", "contacts"].map((viewName) => (
          <button
            key={viewName}
            className={
              selectedView === viewName ? "view-tab active" : "view-tab"
            }
            onClick={() => setSelectedView(viewName)}
            aria-pressed={selectedView === viewName}
          >
            {strings[preferences.lang]?.[viewName] ?? viewName}
          </button>
        ))}
      </section>

      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="state-panel">{labels.loading}</div>
      ) : selectedView === "board" ? (
        <div className="board" aria-label="Application board">
          {boardColumns.map((statusKey) => (
            <div key={statusKey} className="board-column">
              <h2>{STATUS_META[statusKey].label}</h2>
              {filteredApps.filter((app) => app.status === statusKey).length ===
              0 ? (
                <div className="empty-column">No entries</div>
              ) : (
                filteredApps
                  .filter((app) => app.status === statusKey)
                  .map((application) => (
                    <article
                      key={application.id}
                      className="application-card"
                      tabIndex={0}
                    >
                      <div className="card-topline">
                        <span
                          className="pill"
                          style={{
                            background: STATUS_META[application.status].color,
                          }}
                        >
                          {STATUS_META[application.status].label}
                        </span>
                        <span className="meta-id">{application.id}</span>
                      </div>
                      <h3>{application.role}</h3>
                      <p>{application.company}</p>
                      <div className="subline">
                        <span>{formatDate(application.date_applied)}</span>
                        <span>
                          {SOURCE_LABEL[application.source] ??
                            application.source}
                        </span>
                      </div>
                    </article>
                  ))
              )}
            </div>
          ))}
        </div>
      ) : selectedView === "timeline" ? (
        <div className="timeline" aria-label="Application timeline">
          {[...filteredApps]
            .sort(
              (left, right) =>
                new Date(right.date_applied) - new Date(left.date_applied),
            )
            .map((application) => (
              <div key={application.id} className="timeline-item">
                <div
                  className="timeline-dot"
                  style={{ background: STATUS_META[application.status].color }}
                />
                <div className="timeline-body">
                  <strong>{application.company}</strong>
                  <span>{application.role}</span>
                  <small>{formatDate(application.date_applied)}</small>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="contact-list" aria-label="Contacts list">
          {contacts.length === 0 ? (
            <div className="state-panel">No contacts available.</div>
          ) : (
            contacts.map((contact) => (
              <article key={contact.id} className="contact-card">
                <div>
                  <h3>{contact.person}</h3>
                  <p>{contact.company}</p>
                </div>
                <span>{contact.last_message_date ?? "No recent message"}</span>
              </article>
            ))
          )}
        </div>
      )}

      {!filteredApps.length && !loading ? (
        <div className="state-panel">{labels.noResults}</div>
      ) : null}

      <aside className="sidebar-panel" aria-label={labels.connectClaude}>
        <h2>{labels.connectClaude}</h2>
        <p>Use the following MCP config with Claude Desktop or VS Code:</p>
        <pre>{`{
  "mcpServers": {
    "job-tracker": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}`}</pre>
      </aside>
    </div>
  );
}

function SummaryCard({ title, value, hint }) {
  return (
    <div className="summary-card" aria-label={title}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

const styles = `
  :root {
    --bg: #f6f2ea;
    --panel: #fffaf2;
    --panel-strong: #efe3cc;
    --card: #fff;
    --text: #1c2431;
    --muted: #667286;
    --border: rgba(28, 36, 49, 0.12);
    --chip: #ece2cf;
    --shadow: 0 14px 28px rgba(28, 36, 49, 0.08);
  }

  html[data-theme="dark"] {
    --bg: #111827;
    --panel: #1f2937;
    --panel-strong: #0f172a;
    --card: #111827;
    --text: #e5e7eb;
    --muted: #9ca3af;
    --border: rgba(148, 163, 184, 0.22);
    --chip: #374151;
    --shadow: 0 14px 28px rgba(15, 23, 42, 0.5);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: Inter, system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
  }

  button, input, textarea { font: inherit; }

  .dashboard-shell {
    max-width: 1240px;
    margin: 0 auto;
    padding: 28px;
    background: var(--bg);
    color: var(--text);
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .eyebrow {
    color: var(--muted);
    letter-spacing: 0.14em;
    font-size: 11px;
    margin: 0 0 6px;
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 3vw, 3rem);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .search {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0 12px;
    min-width: 260px;
    height: 42px;
  }

  .search input {
    border: 0;
    background: transparent;
    color: var(--text);
    width: 100%;
    outline: none;
  }

  .chip-button, .filter, .view-tab {
    border: 1px solid var(--border);
    background: var(--panel);
    color: var(--text);
    border-radius: 999px;
    padding: 9px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chip-button:hover, .filter:hover, .view-tab:hover {
    background: var(--panel-strong);
  }

  .filter.active, .view-tab.active {
    background: var(--text);
    color: var(--bg);
    border-color: var(--text);
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .summary-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 18px;
    box-shadow: var(--shadow);
  }

  .summary-card span {
    display: block;
    color: var(--muted);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .summary-card strong {
    display: block;
    margin: 12px 0 6px;
    font-size: clamp(1.6rem, 2vw, 2.3rem);
  }

  .summary-card small {
    color: var(--muted);
  }

  .filters, .view-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 18px;
    margin-top: 16px;
  }

  .board-column {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 14px;
    min-height: 220px;
  }

  .board-column h2 {
    margin: 0 0 12px;
    font-size: 1rem;
  }

  .application-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    box-shadow: var(--shadow);
  }

  .card-topline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .pill {
    display: inline-flex;
    padding: 5px 10px;
    border-radius: 999px;
    color: white;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .meta-id {
    color: var(--muted);
    font-size: 0.7rem;
  }

  .application-card h3 {
    margin: 0 0 4px;
    font-size: 1.1rem;
  }

  .application-card p {
    margin: 0 0 10px;
    color: var(--muted);
  }

  .subline {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.72rem;
    color: var(--muted);
  }

  .timeline {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .timeline-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  .timeline-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .timeline-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .timeline-body span, .timeline-body small {
    color: var(--muted);
  }

  .contact-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .contact-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .contact-card h3 {
    margin: 0 0 4px;
  }

  .contact-card p, .contact-card span {
    margin: 0;
    color: var(--muted);
  }

  .state-panel, .empty-column {
    background: var(--panel);
    border: 1px dashed var(--border);
    border-radius: 14px;
    padding: 24px;
    text-align: center;
    color: var(--muted);
  }

  .sidebar-panel {
    margin-top: 24px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 18px;
    box-shadow: var(--shadow);
  }

  .sidebar-panel h2 {
    margin: 0 0 8px;
  }

  .sidebar-panel pre {
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--panel-strong);
    border-radius: 12px;
    padding: 12px;
    overflow-x: auto;
  }

  .error-banner {
    margin-bottom: 12px;
    background: rgba(166, 61, 61, 0.18);
    border: 1px solid rgba(166, 61, 61, 0.4);
    color: #a00d0d;
    border-radius: 12px;
    padding: 10px 12px;
  }

  @media (max-width: 720px) {
    .dashboard-shell { padding: 18px; }
    .overview-grid { grid-template-columns: 1fr; }
    .search { min-width: 100%; }
  }
`;

export default App;
