import React, { useMemo, useState } from "react";
import { NavLink, Routes, Route, Navigate, useNavigate } from "react-router-dom";

/* =======================
   Storage (compatibile)
======================= */
const WORKOUT_KEYS = [
  "fitapp_workouts_v1",      // probabile key usata in app desktop
  "fitapp_workouts",
  "palestra3d_workouts",
  "workouts",
];

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* =======================
   UI atoms
======================= */
function Tab({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        flex: 1,
        textAlign: "center",
        padding: "12px 8px",
        textDecoration: "none",
        color: isActive ? "#7dd3fc" : "white",
        fontWeight: 800,
      })}
    >
      {label}
    </NavLink>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", type = "button", disabled }) {
  const isGhost = variant === "ghost";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 14px",
        borderRadius: 14,
        fontSize: 16,
        fontWeight: 800,
        border: isGhost ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(125,211,252,0.35)",
        background: isGhost ? "rgba(255,255,255,0.06)" : "rgba(125,211,252,0.18)",
        color: "white",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "white",
        outline: "none",
        fontSize: 15,
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
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "white",
        outline: "none",
        fontSize: 15,
        resize: "vertical",
      }}
    />
  );
}

function SectionTitle({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
      {right}
    </div>
  );
}

/* =======================
   Screens
======================= */
function HomeScreen() {
  const nav = useNavigate();
  const [storageKey, setStorageKey] = useState(() => loadWorkouts().key);
  const [workouts, setWorkouts] = useState(() => loadWorkouts().data);

  const today = todayISO();

  const todayWorkouts = useMemo(() => {
    return workouts
      .filter((w) => (w?.date || w?.day || w?.isoDate) === today)
      .sort((a, b) => (a?.createdAt || 0) - (b?.createdAt || 0));
  }, [workouts, today]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <SectionTitle
        title="Home"
        right={
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {today}
          </div>
        }
      />

      <Card>
        <SectionTitle title="Allenamento di oggi" />
        <div style={{ height: 10 }} />

        {todayWorkouts.length === 0 ? (
          <div style={{ opacity: 0.85, lineHeight: 1.4 }}>
            Nessun allenamento salvato per oggi.
            <div style={{ height: 10 }} />
            <Btn onClick={() => nav("/m/new")}>+ Allenamento</Btn>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {todayWorkouts.map((w) => (
              <div
                key={w.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {w.title || "Allenamento"}
                </div>

                {w.note ? (
                  <div style={{ opacity: 0.85, marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {w.note}
                  </div>
                ) : null}

                {Array.isArray(w.exercises) && w.exercises.length > 0 ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    {w.exercises.slice(0, 6).map((ex) => (
                      <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, opacity: 0.92 }}>
                        <span style={{ fontWeight: 700 }}>{ex.name || "Esercizio"}</span>
                        <span style={{ opacity: 0.8 }}>
                          {ex.sets ?? "-"}x{ex.reps ?? "-"} • {ex.kg ?? "-"} kg
                        </span>
                      </div>
                    ))}
                    {w.exercises.length > 6 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        +{w.exercises.length - 6} esercizi…
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}

            <Btn onClick={() => nav("/m/new")}>+ Allenamento</Btn>
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Storage: <span style={{ fontWeight: 800 }}>{storageKey}</span>
        </div>
        <div style={{ height: 10 }} />
        <Btn
          variant="ghost"
          onClick={() => {
            // ricarica da localStorage (utile se desktop salva roba)
            const loaded = loadWorkouts();
            setStorageKey(loaded.key);
            setWorkouts(loaded.data);
          }}
        >
          Aggiorna dati
        </Btn>
      </Card>
    </div>
  );
}

function NewWorkoutScreen() {
  const nav = useNavigate();
  const [{ key: storageKey, data: existing }, setExisting] = useState(() => loadWorkouts());

  const [title, setTitle] = useState("Allenamento");
  const [note, setNote] = useState("");
  const [exName, setExName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [kg, setKg] = useState("0");
  const [exercises, setExercises] = useState([]);

  const addExercise = () => {
    if (!exName.trim()) return;
    setExercises((prev) => [
      ...prev,
      {
        id: uid(),
        name: exName.trim(),
        sets: Number(sets) || 0,
        reps: Number(reps) || 0,
        kg: Number(kg) || 0,
      },
    ]);
    setExName("");
  };

  const removeExercise = (id) => {
    setExercises((prev) => prev.filter((x) => x.id !== id));
  };

  const save = () => {
    const w = {
      id: uid(),
      date: todayISO(),
      createdAt: Date.now(),
      title: title.trim() || "Allenamento",
      note: note.trim(),
      exercises,
    };
    const next = [w, ...existing];
    saveWorkouts(storageKey, next);
    setExisting({ key: storageKey, data: next });
    nav("/m");
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <SectionTitle
        title="Nuovo allenamento"
        right={
          <button
            onClick={() => nav("/m")}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              fontWeight: 900,
              fontSize: 14,
              opacity: 0.85,
            }}
          >
            Chiudi
          </button>
        }
      />

      <Card>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Titolo</div>
        <Input value={title} onChange={setTitle} placeholder="Es. Petto & Tricipiti" />
        <div style={{ height: 12 }} />
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Nota</div>
        <TextArea value={note} onChange={setNote} placeholder="Note (facoltative)" />
      </Card>

      <Card>
        <SectionTitle title="Esercizi" />
        <div style={{ height: 10 }} />

        <div style={{ display: "grid", gap: 8 }}>
          <Input value={exName} onChange={setExName} placeholder="Nome esercizio (es. Panca piana)" />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              inputMode="numeric"
              placeholder="Serie"
              style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "white" }}
            />
            <input
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              inputMode="numeric"
              placeholder="Rep"
              style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "white" }}
            />
            <input
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              inputMode="numeric"
              placeholder="Kg"
              style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "white" }}
            />
          </div>

          <Btn onClick={addExercise} disabled={!exName.trim()}>
            + Aggiungi esercizio
          </Btn>
        </div>

        {exercises.length > 0 ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {exercises.map((ex) => (
              <div
                key={ex.id}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.18)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{ex.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {ex.sets}x{ex.reps} • {ex.kg} kg
                  </div>
                </div>
                <button
                  onClick={() => removeExercise(ex.id)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "white",
                    borderRadius: 12,
                    padding: "8px 10px",
                    fontWeight: 900,
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Btn onClick={save}>Salva allenamento</Btn>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 12px 0" }}>{title}</h2>
      <p style={{ opacity: 0.85, margin: 0 }}>Schermata mobile in costruzione.</p>
    </div>
  );
}

/* =======================
   App shell
======================= */
export default function MobileApp() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0f14", color: "white" }}>
      <div style={{ paddingBottom: 70 }}>
        <Routes>
          <Route path="/m" element={<HomeScreen />} />
          <Route path="/m/new" element={<NewWorkoutScreen />} />
          <Route path="/m/workouts" element={<Placeholder title="Allenamenti" />} />
          <Route path="/m/stats" element={<Placeholder title="Statistiche" />} />
          <Route path="/m/profile" element={<Placeholder title="Profilo" />} />
          <Route path="*" element={<Navigate to="/m" replace />} />
        </Routes>
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          display: "flex",
          background: "rgba(17,24,34,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Tab to="/m" label="Home" />
        <Tab to="/m/workouts" label="Allen." />
        <Tab to="/m/stats" label="Stats" />
        <Tab to="/m/profile" label="Profilo" />
      </div>
    </div>
  );
}