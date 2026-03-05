import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";

/* =========================================================
   MOBILE APP (iPhone-ready)
   - No input zoom (fontSize >= 16)
   - Tab bar bottom + safe-area
   - Home / Workouts / Stats / Profile complete
   - LocalStorage storage (auto-detect key)
========================================================= */

/* ---------------------------
   Storage (compatibile)
--------------------------- */
const WORKOUT_KEYS = [
  "fitapp_workouts_v1", // probabile key desktop
  "fitapp_workouts",
  "palestra3d_workouts",
  "workouts",
];

const SETTINGS_KEY = "palestra3d_mobile_settings_v1";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function pickStorageKey() {
  for (const k of WORKOUT_KEYS) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    const parsed = safeParse(raw);
    if (Array.isArray(parsed)) return k;
  }
  return WORKOUT_KEYS[0];
}

function loadWorkouts() {
  const key = pickStorageKey();
  const raw = localStorage.getItem(key);
  const parsed = raw ? safeParse(raw) : null;
  return { key, data: Array.isArray(parsed) ? parsed : [] };
}

function saveWorkouts(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  const parsed = raw ? safeParse(raw) : null;
  return parsed && typeof parsed === "object"
    ? parsed
    : {
        defaultTitle: "Allenamento",
        weightUnit: "kg",
        showEstLoad: true,
      };
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDate(itISO) {
  if (!itISO) return "";
  // yyyy-mm-dd -> dd/mm/yyyy
  const [y, m, d] = String(itISO).split("-");
  if (!y || !m || !d) return itISO;
  return `${d}/${m}/${y}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeWorkout(w) {
  // Supporta strutture diverse: date/day/isoDate
  const date = w?.date || w?.day || w?.isoDate || "";
  const title = w?.title || w?.name || "Allenamento";
  const note = w?.note || w?.notes || "";
  const exercises = Array.isArray(w?.exercises) ? w.exercises : Array.isArray(w?.items) ? w.items : [];
  const id = w?.id || w?._id || uid();
  const createdAt = w?.createdAt || w?.ts || Date.now();
  return { ...w, id, date, title, note, exercises, createdAt };
}

/* ---------------------------
   iOS UX fixes
--------------------------- */
function useBodyLockFix() {
  useEffect(() => {
    // Evita bordini / sfondi strani
    document.documentElement.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.minHeight = "100%";
    document.body.style.background = "#0b0f14";
    document.body.style.color = "white";
    document.body.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  }, []);
}

/* =========================================================
   UI atoms (stile app)
========================================================= */
const C = {
  bg: "#0b0f14",
  card: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.10)",
  border2: "rgba(255,255,255,0.14)",
  ink: "white",
  muted: "rgba(255,255,255,0.75)",
  accent: "#7dd3fc",
  accentBg: "rgba(125,211,252,0.18)",
};

function AppShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.ink,
        paddingBottom: "calc(70px + env(safe-area-inset-bottom))",
      }}
    >
      {children}
      <BottomTabs />
    </div>
  );
}

function Header({ title, right }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(11,15,20,0.82)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.border}`,
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 0.2 }}>{title}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function Row({ children, gap = 10, style }) {
  return (
    <div style={{ display: "flex", gap, alignItems: "center", ...style }}>
      {children}
    </div>
  );
}

function H2({ children, right }) {
  return (
    <Row style={{ justifyContent: "space-between" }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{children}</div>
      {right}
    </Row>
  );
}

function Btn({ children, onClick, variant = "primary", type = "button", disabled }) {
  const ghost = variant === "ghost";
  const danger = variant === "danger";
  const bg = danger ? "rgba(239,68,68,0.18)" : ghost ? "rgba(255,255,255,0.06)" : C.accentBg;
  const br = danger ? "rgba(239,68,68,0.35)" : ghost ? "rgba(255,255,255,0.18)" : "rgba(125,211,252,0.35)";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 14px",
        borderRadius: 14,
        fontSize: 16, // IMPORTANT: no iOS zoom
        fontWeight: 900,
        border: `1px solid ${br}`,
        background: bg,
        color: "white",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SmallBtn({ children, onClick, variant = "ghost" }) {
  const danger = variant === "danger";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 900,
        border: `1px solid ${danger ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.18)"}`,
        background: danger ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
        color: "white",
      }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border: `1px solid ${C.border2}`,
        background: "rgba(0,0,0,0.25)",
        color: "white",
        outline: "none",
        fontSize: 16, // IMPORTANT: no iOS zoom
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border: `1px solid ${C.border2}`,
        background: "rgba(0,0,0,0.25)",
        color: "white",
        outline: "none",
        fontSize: 16, // IMPORTANT: no iOS zoom
        resize: "vertical",
      }}
    />
  );
}

function NumberBox({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="numeric"
      placeholder={placeholder}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${C.border2}`,
        background: "rgba(0,0,0,0.25)",
        color: "white",
        fontSize: 16, // IMPORTANT: no iOS zoom
        outline: "none",
      }}
    />
  );
}

function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderRadius: 999,
        border: `1px solid ${C.border}`,
        background: "rgba(0,0,0,0.20)",
        fontSize: 12,
        fontWeight: 800,
        color: "rgba(255,255,255,0.9)",
      }}
    >
      {children}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "12px 0" }} />;
}

/* ---------------------------
   Tabs bottom
--------------------------- */
function BottomTabs() {
  const location = useLocation();
  const hideOnNew = location.pathname.startsWith("/m/new") || location.pathname.startsWith("/m/w/");
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        height: 64,
        paddingBottom: "env(safe-area-inset-bottom)",
        display: hideOnNew ? "none" : "flex",
        background: "rgba(17,24,34,0.95)",
        borderTop: `1px solid ${C.border}`,
        backdropFilter: "blur(10px)",
      }}
    >
      <Tab to="/m" label="Home" />
      <Tab to="/m/workouts" label="Allen." />
      <Tab to="/m/stats" label="Stats" />
      <Tab to="/m/profile" label="Profilo" />
    </div>
  );
}

function Tab({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        flex: 1,
        textAlign: "center",
        padding: "12px 8px",
        textDecoration: "none",
        color: isActive ? C.accent : "white",
        fontWeight: 900,
        fontSize: 13,
        opacity: isActive ? 1 : 0.85,
      })}
    >
      {label}
    </NavLink>
  );
}

/* =========================================================
   Data helpers
========================================================= */
function estimateWorkoutLoad(exercises) {
  // carico stimato = sum(sets * reps * kg)
  let total = 0;
  for (const ex of exercises || []) {
    const sets = Number(ex?.sets ?? 0) || 0;
    const reps = Number(ex?.reps ?? 0) || 0;
    const kg = Number(ex?.kg ?? 0) || 0;
    total += sets * reps * kg;
  }
  return total;
}

function flattenExercises(workouts) {
  const map = new Map();
  for (const w of workouts) {
    for (const ex of w.exercises || []) {
      const name = String(ex?.name || "").trim();
      if (!name) continue;
      map.set(name.toLowerCase(), (map.get(name.toLowerCase()) || 0) + 1);
    }
  }
  const arr = [...map.entries()].map(([k, v]) => ({ name: k, count: v }));
  arr.sort((a, b) => b.count - a.count);
  return arr;
}

/* =========================================================
   Screens
========================================================= */
function useWorkoutsModel() {
  const [storageKey, setStorageKey] = useState(() => loadWorkouts().key);
  const [workouts, setWorkouts] = useState(() => loadWorkouts().data.map(normalizeWorkout));

  const reload = () => {
    const loaded = loadWorkouts();
    setStorageKey(loaded.key);
    setWorkouts(loaded.data.map(normalizeWorkout));
  };

  const upsert = (w) => {
    setWorkouts((prev) => {
      const next = [normalizeWorkout(w), ...prev.map(normalizeWorkout)];
      saveWorkouts(storageKey, next);
      return next;
    });
  };

  const remove = (id) => {
    setWorkouts((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveWorkouts(storageKey, next);
      return next;
    });
  };

  const replaceAll = (dataArray) => {
    const next = (Array.isArray(dataArray) ? dataArray : []).map(normalizeWorkout);
    setWorkouts(next);
    saveWorkouts(storageKey, next);
  };

  return { storageKey, workouts, reload, upsert, remove, replaceAll };
}

/* ---------------- HOME ---------------- */
function HomeScreen({ model, settings }) {
  const nav = useNavigate();
  const today = todayISO();

  const todayWorkouts = useMemo(() => {
    return model.workouts
      .filter((w) => w.date === today)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [model.workouts, today]);

  const lastWorkouts = useMemo(() => {
    return model.workouts
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5);
  }, [model.workouts]);

  const todayLoad = useMemo(() => {
    return todayWorkouts.reduce((sum, w) => sum + estimateWorkoutLoad(w.exercises), 0);
  }, [todayWorkouts]);

  return (
    <div>
      <Header
        title="Palestra 3D"
        right={<Pill>Oggi {fmtDate(today)}</Pill>}
      />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <Card>
          <H2 right={<SmallBtn onClick={() => nav("/m/new")}>+ Allenamento</SmallBtn>}>
            Allenamento di oggi
          </H2>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {todayWorkouts.length === 0 ? (
              <div style={{ color: C.muted, lineHeight: 1.4 }}>
                Nessun allenamento salvato per oggi.
                <div style={{ height: 10 }} />
                <Btn onClick={() => nav("/m/new")}>+ Crea allenamento</Btn>
              </div>
            ) : (
              <>
                {settings.showEstLoad ? (
                  <Row style={{ justifyContent: "space-between" }}>
                    <Pill>Sessioni: {todayWorkouts.length}</Pill>
                    <Pill>Carico stimato: {Math.round(todayLoad).toLocaleString()} {settings.weightUnit}</Pill>
                  </Row>
                ) : (
                  <Row style={{ justifyContent: "space-between" }}>
                    <Pill>Sessioni: {todayWorkouts.length}</Pill>
                    <Pill>Totale: oggi</Pill>
                  </Row>
                )}

                {todayWorkouts.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: `1px solid ${C.border}`,
                      background: "rgba(0,0,0,0.18)",
                    }}
                    onClick={() => nav(`/m/w/${w.id}`)}
                  >
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{w.title}</div>
                    {w.note ? (
                      <div style={{ marginTop: 6, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                        {w.note}
                      </div>
                    ) : null}

                    {Array.isArray(w.exercises) && w.exercises.length > 0 ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                        {w.exercises.slice(0, 5).map((ex) => (
                          <Row key={ex.id || ex.name} style={{ justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 800, fontSize: 13 }}>{ex.name || "Esercizio"}</span>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>
                              {ex.sets ?? "-"}x{ex.reps ?? "-"} • {ex.kg ?? "-"} {settings.weightUnit}
                            </span>
                          </Row>
                        ))}
                        {w.exercises.length > 5 ? (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>+{w.exercises.length - 5} esercizi…</div>
                        ) : null}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                        Nessun esercizio aggiunto.
                      </div>
                    )}
                  </div>
                ))}

                <Btn onClick={() => nav("/m/new")}>+ Aggiungi un’altra sessione</Btn>
              </>
            )}
          </div>
        </Card>

        <Card>
          <H2 right={<SmallBtn onClick={model.reload}>Aggiorna</SmallBtn>}>Ultimi allenamenti</H2>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {lastWorkouts.length === 0 ? (
              <div style={{ color: C.muted }}>Nessun allenamento salvato.</div>
            ) : (
              lastWorkouts.map((w) => (
                <div
                  key={w.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${C.border}`,
                    background: "rgba(0,0,0,0.18)",
                  }}
                  onClick={() => nav(`/m/w/${w.id}`)}
                >
                  <Row style={{ justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 900 }}>{w.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{fmtDate(w.date)}</div>
                  </Row>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                    Esercizi: {Array.isArray(w.exercises) ? w.exercises.length : 0}
                    {settings.showEstLoad ? ` • Carico: ${Math.round(estimateWorkoutLoad(w.exercises)).toLocaleString()} ${settings.weightUnit}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>

          <Divider />

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Storage attivo: <span style={{ fontWeight: 900 }}>{model.storageKey}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- WORKOUTS LIST ---------------- */
function WorkoutsScreen({ model, settings }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const base = model.workouts
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const query = q.trim().toLowerCase();
    if (!query) return base;

    return base.filter((w) => {
      const hay = `${w.title} ${w.note} ${w.date} ${(w.exercises || []).map((x) => x.name).join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [model.workouts, q]);

  return (
    <div>
      <Header
        title="Allenamenti"
        right={<SmallBtn onClick={() => nav("/m/new")}>+ Nuovo</SmallBtn>}
      />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <Card>
          <Input value={q} onChange={setQ} placeholder="Cerca (titolo, data, esercizi…)" />
          <div style={{ height: 10 }} />
          <Row style={{ justifyContent: "space-between" }}>
            <Pill>Totale: {model.workouts.length}</Pill>
            <SmallBtn onClick={model.reload}>Aggiorna</SmallBtn>
          </Row>
        </Card>

        <div style={{ display: "grid", gap: 10 }}>
          {list.length === 0 ? (
            <Card>
              <div style={{ color: C.muted }}>Nessun risultato.</div>
            </Card>
          ) : (
            list.map((w) => (
              <Card key={w.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{w.title}</div>
                  <Pill>{fmtDate(w.date)}</Pill>
                </Row>

                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                  Esercizi: {Array.isArray(w.exercises) ? w.exercises.length : 0}
                  {settings.showEstLoad ? ` • Carico: ${Math.round(estimateWorkoutLoad(w.exercises)).toLocaleString()} ${settings.weightUnit}` : ""}
                </div>

                {w.note ? (
                  <div style={{ marginTop: 10, opacity: 0.85, whiteSpace: "pre-wrap" }}>{w.note}</div>
                ) : null}

                <div style={{ height: 12 }} />
                <Row>
                  <SmallBtn onClick={() => nav(`/m/w/${w.id}`)}>Apri</SmallBtn>
                  <div style={{ flex: 1 }} />
                  <SmallBtn variant="danger" onClick={() => { if (confirm("Eliminare questo allenamento?")) model.remove(w.id); }}>
                    Elimina
                  </SmallBtn>
                </Row>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- WORKOUT DETAIL ---------------- */
function WorkoutDetailScreen({ model, settings }) {
  const nav = useNavigate();
  const { id } = useParams();
  const w = useMemo(() => model.workouts.find((x) => String(x.id) === String(id)), [model.workouts, id]);

  if (!w) {
    return (
      <div>
        <Header title="Dettaglio" right={<SmallBtn onClick={() => nav("/m/workouts")}>Indietro</SmallBtn>} />
        <div style={{ padding: 16 }}>
          <Card>
            <div style={{ color: C.muted }}>Allenamento non trovato.</div>
          </Card>
        </div>
      </div>
    );
  }

  const load = estimateWorkoutLoad(w.exercises);

  return (
    <div>
      <Header
        title="Dettaglio"
        right={<SmallBtn onClick={() => nav("/m/workouts")}>Indietro</SmallBtn>}
      />
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <Card>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>{w.title}</div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>{fmtDate(w.date)}</div>
            </div>
            <Pill>{Array.isArray(w.exercises) ? w.exercises.length : 0} esercizi</Pill>
          </Row>

          {settings.showEstLoad ? (
            <div style={{ marginTop: 10 }}>
              <Pill>Carico stimato: {Math.round(load).toLocaleString()} {settings.weightUnit}</Pill>
            </div>
          ) : null}

          {w.note ? (
            <>
              <Divider />
              <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{w.note}</div>
            </>
          ) : null}
        </Card>

        <Card>
          <H2>Esercizi</H2>
          <div style={{ height: 10 }} />
          {Array.isArray(w.exercises) && w.exercises.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {w.exercises.map((ex, idx) => (
                <div
                  key={ex.id || `${ex.name}-${idx}`}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${C.border}`,
                    background: "rgba(0,0,0,0.18)",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{ex.name || "Esercizio"}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    {ex.sets ?? "-"} x {ex.reps ?? "-"} • {ex.kg ?? "-"} {settings.weightUnit}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.muted }}>Nessun esercizio salvato.</div>
          )}
        </Card>

        <Btn
          variant="danger"
          onClick={() => {
            if (confirm("Eliminare questo allenamento?")) {
              model.remove(w.id);
              nav("/m/workouts");
            }
          }}
        >
          Elimina allenamento
        </Btn>
      </div>
    </div>
  );
}

/* ---------------- NEW WORKOUT ---------------- */
function NewWorkoutScreen({ model, settings }) {
  const nav = useNavigate();
  const [title, setTitle] = useState(settings.defaultTitle || "Allenamento");
  const [note, setNote] = useState("");
  const [exName, setExName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [kg, setKg] = useState("0");
  const [exercises, setExercises] = useState([]);

  const addExercise = () => {
    const name = exName.trim();
    if (!name) return;
    setExercises((prev) => [
      ...prev,
      {
        id: uid(),
        name,
        sets: Number(sets) || 0,
        reps: Number(reps) || 0,
        kg: Number(kg) || 0,
      },
    ]);
    setExName("");
  };

  const removeExercise = (id) => setExercises((prev) => prev.filter((x) => x.id !== id));

  const totalLoad = useMemo(() => estimateWorkoutLoad(exercises), [exercises]);

  const save = () => {
    const w = normalizeWorkout({
      id: uid(),
      date: todayISO(),
      createdAt: Date.now(),
      title: title.trim() || "Allenamento",
      note: note.trim(),
      exercises,
    });
    model.upsert(w);
    nav("/m");
  };

  return (
    <div>
      <Header
        title="Nuovo allenamento"
        right={<SmallBtn onClick={() => nav("/m")}>Chiudi</SmallBtn>}
      />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Titolo</div>
          <Input value={title} onChange={setTitle} placeholder="Es. Petto & Tricipiti" />
          <div style={{ height: 12 }} />
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Note</div>
          <TextArea value={note} onChange={setNote} placeholder="Note (facoltative)" />
        </Card>

        <Card>
          <H2 right={settings.showEstLoad ? <Pill>Carico: {Math.round(totalLoad).toLocaleString()} {settings.weightUnit}</Pill> : null}>
            Esercizi
          </H2>
          <div style={{ height: 10 }} />

          <div style={{ display: "grid", gap: 8 }}>
            <Input value={exName} onChange={setExName} placeholder="Nome esercizio (es. Panca piana)" />
            <Row gap={8}>
              <NumberBox value={sets} onChange={setSets} placeholder="Serie" />
              <NumberBox value={reps} onChange={setReps} placeholder="Rep" />
              <NumberBox value={kg} onChange={setKg} placeholder="Kg" />
            </Row>

            <Btn onClick={addExercise} disabled={!exName.trim()}>
              + Aggiungi esercizio
            </Btn>
          </div>

          {exercises.length > 0 ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${C.border}`,
                    background: "rgba(0,0,0,0.18)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {ex.sets}x{ex.reps} • {ex.kg} {settings.weightUnit}
                    </div>
                  </div>
                  <SmallBtn variant="danger" onClick={() => removeExercise(ex.id)}>
                    Rimuovi
                  </SmallBtn>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Aggiungi almeno 1 esercizio.</div>
          )}
        </Card>

        <Btn onClick={save} disabled={!title.trim()}>
          Salva allenamento
        </Btn>
      </div>
    </div>
  );
}

/* ---------------- STATS ---------------- */
function StatsScreen({ model, settings }) {
  const workouts = model.workouts;

  const totals = useMemo(() => {
    const totalWorkouts = workouts.length;
    const totalExercises = workouts.reduce((sum, w) => sum + (Array.isArray(w.exercises) ? w.exercises.length : 0), 0);
    const totalLoad = workouts.reduce((sum, w) => sum + estimateWorkoutLoad(w.exercises), 0);

    const byDate = new Map();
    for (const w of workouts) {
      if (!w.date) continue;
      byDate.set(w.date, (byDate.get(w.date) || 0) + 1);
    }
    const activeDays = byDate.size;

    return { totalWorkouts, totalExercises, totalLoad, activeDays };
  }, [workouts]);

  const topExercises = useMemo(() => flattenExercises(workouts).slice(0, 8), [workouts]);

  const recentLoad = useMemo(() => {
    const last10 = workouts.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 10);
    const load = last10.reduce((sum, w) => sum + estimateWorkoutLoad(w.exercises), 0);
    return { count: last10.length, load };
  }, [workouts]);

  return (
    <div>
      <Header title="Statistiche" right={<SmallBtn onClick={model.reload}>Aggiorna</SmallBtn>} />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <Card>
          <H2>Panoramica</H2>
          <div style={{ height: 10 }} />
          <div style={{ display: "grid", gap: 10 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Pill>Allenamenti: {totals.totalWorkouts}</Pill>
              <Pill>Giorni attivi: {totals.activeDays}</Pill>
            </Row>
            <Row style={{ justifyContent: "space-between" }}>
              <Pill>Esercizi totali: {totals.totalExercises}</Pill>
              {settings.showEstLoad ? (
                <Pill>Carico totale: {Math.round(totals.totalLoad).toLocaleString()} {settings.weightUnit}</Pill>
              ) : (
                <Pill>Carico: off</Pill>
              )}
            </Row>
            {settings.showEstLoad ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Ultimi {recentLoad.count} allenamenti: {Math.round(recentLoad.load).toLocaleString()} {settings.weightUnit} (stimato)
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <H2>Esercizi più frequenti</H2>
          <div style={{ height: 10 }} />
          {topExercises.length === 0 ? (
            <div style={{ color: C.muted }}>Nessun dato.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topExercises.map((x) => (
                <Row key={x.name} style={{ justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900, textTransform: "capitalize" }}>{x.name}</div>
                  <Pill>{x.count}x</Pill>
                </Row>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------- PROFILE ---------------- */
function ProfileScreen({ model, settings, setSettings }) {
  const [draft, setDraft] = useState(settings);
  const fileRef = useRef(null);

  useEffect(() => setDraft(settings), [settings]);

  const exportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      storageKey: model.storageKey,
      workouts: model.workouts,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "palestra3d_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (file) => {
    const text = await file.text();
    const parsed = safeParse(text);
    if (!parsed || typeof parsed !== "object") return alert("File non valido.");
    if (Array.isArray(parsed.workouts)) {
      model.replaceAll(parsed.workouts);
    } else if (Array.isArray(parsed)) {
      // support: file che è direttamente un array
      model.replaceAll(parsed);
    }
    if (parsed.settings && typeof parsed.settings === "object") {
      saveSettings(parsed.settings);
      setSettings(parsed.settings);
    }
    alert("Import completato.");
  };

  return (
    <div>
      <Header title="Profilo" right={<SmallBtn onClick={model.reload}>Sync</SmallBtn>} />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <Card>
          <H2>Preferenze</H2>
          <div style={{ height: 10 }} />
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Titolo default</div>
              <Input value={draft.defaultTitle} onChange={(v) => setDraft((p) => ({ ...p, defaultTitle: v }))} placeholder="Es. Allenamento" />
            </div>

            <Row style={{ justifyContent: "space-between" }}>
              <Pill>Unità: {draft.weightUnit}</Pill>
              <SmallBtn
                onClick={() =>
                  setDraft((p) => ({ ...p, weightUnit: p.weightUnit === "kg" ? "lb" : "kg" }))
                }
              >
                Cambia
              </SmallBtn>
            </Row>

            <Row style={{ justifyContent: "space-between" }}>
              <Pill>Carico stimato: {draft.showEstLoad ? "ON" : "OFF"}</Pill>
              <SmallBtn onClick={() => setDraft((p) => ({ ...p, showEstLoad: !p.showEstLoad }))}>
                Toggle
              </SmallBtn>
            </Row>

            <Btn
              onClick={() => {
                saveSettings(draft);
                setSettings(draft);
                alert("Salvato.");
              }}
            >
              Salva preferenze
            </Btn>
          </div>
        </Card>

        <Card>
          <H2>Dati</H2>
          <div style={{ height: 10 }} />
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Storage allenamenti: <span style={{ fontWeight: 900 }}>{model.storageKey}</span>
            </div>
            <Btn variant="ghost" onClick={exportJSON}>Export backup JSON</Btn>

            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJSON(f);
                e.target.value = "";
              }}
            />

            <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Btn>

            <Btn
              variant="danger"
              onClick={() => {
                if (confirm("RESET totale? Cancello allenamenti e impostazioni mobile.")) {
                  // reset workouts
                  saveWorkouts(model.storageKey, []);
                  // reset settings
                  localStorage.removeItem(SETTINGS_KEY);
                  alert("Reset fatto. Ricarica la pagina.");
                }
              }}
            >
              Reset totale
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================
   Router
========================================================= */
export default function MobileApp() {
  useBodyLockFix();

  const model = useWorkoutsModel();
  const [settings, setSettings] = useState(() => loadSettings());

  // sync settings on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <AppShell>
      <Routes>
        <Route path="/m" element={<HomeScreen model={model} settings={settings} />} />
        <Route path="/m/new" element={<NewWorkoutScreen model={model} settings={settings} />} />
        <Route path="/m/workouts" element={<WorkoutsScreen model={model} settings={settings} />} />
        <Route path="/m/w/:id" element={<WorkoutDetailScreen model={model} settings={settings} />} />
        <Route path="/m/stats" element={<StatsScreen model={model} settings={settings} />} />
        <Route path="/m/profile" element={<ProfileScreen model={model} settings={settings} setSettings={setSettings} />} />
        <Route path="*" element={<Navigate to="/m" replace />} />
      </Routes>
    </AppShell>
  );
}