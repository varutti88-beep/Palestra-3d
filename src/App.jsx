import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

/**
 * PROGETTO PALESTRA 2 — App.jsx unico
 * Pagine:
 * 1) /login  (registrazione sx, profili dx con Entra/Elimina)
 * 2) /dashboard (calendario + aggiunta/modifica allenamenti con picker esercizi)
 * 3) /stats
 * 4) /progress
 * 5) /search
 */

const LS_PROFILES = "fitapp_profiles_v1";
const LS_ACTIVE_PROFILE_ID = "fitapp_active_profile_id_v1";
const LS_WORKOUTS_PREFIX = "fitapp_workouts_profile_";

// Esercizi base (puoi ampliarla quando vuoi)
const DEFAULT_EXERCISES = [
  // Petto
  "Panca piana",
  "Panca inclinata",
  "Spinte manubri panca piana",
  "Spinte manubri inclinata",
  "Croci ai cavi",
  "Chest press",
  "Dip",
  // Schiena
  "Lat machine",
  "Trazioni",
  "Rematore bilanciere",
  "Rematore manubrio",
  "Pulley",
  "T-Bar row",
  // Spalle
  "Shoulder press",
  "Military press",
  "Alzate laterali",
  "Alzate posteriori",
  "Vertical row",
  // Braccia
  "Curl bilanciere",
  "Curl manubri",
  "Curl martello",
  "Curl panca Scott",
  "Pushdown tricipiti",
  "French press",
  // Gambe
  "Squat",
  "Leg press",
  "Leg extension",
  "Leg curl",
  "Affondi",
  "Calf raises",
  // Core/Cardio
  "Addome",
  "Plank",
  "Tapis roulant",
  "Cyclette",
];

// ---------------- Utils ----------------
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function parseISO(iso) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}
function formatDateIT(iso) {
  try {
    const d = parseISO(iso);
    return d.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
function isSameMonth(aISO, bISO) {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function lastNDaysISO(n) {
  const now = new Date();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out.reverse();
}
function calcExerciseVolume(ex) {
  // ex: { name, sets, reps, kg }
  const sets = Number(ex.sets) || 0;
  const reps = Number(ex.reps) || 0;
  const kg = Number(ex.kg) || 0;
  return sets * reps * kg;
}
function bestSetScoreFromSimple(ex) {
  // Con dati aggregati (serie/rip/kg), usiamo score = kg * reps (approssimazione)
  const reps = Number(ex.reps) || 0;
  const kg = Number(ex.kg) || 0;
  return kg * reps;
}

// ---------------- App ----------------
const PAGE_FLOW = [
  { path: "/login", label: "Login" },
  { path: "/dashboard", label: "Calendario" },
  { path: "/stats", label: "Statistiche" },
  { path: "/progress", label: "Progressione" },
  { path: "/search", label: "Ricerca" },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // remove “bordino bianco” + reset globale
  useEffect(() => {
    document.documentElement.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100%";
    document.body.style.background = "#0b0c10";
    document.body.style.color = "white";
    document.body.style.fontFamily =
      'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  }, []);

  const [profiles, setProfiles] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_PROFILES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [activeProfileId, setActiveProfileId] = useState(() => {
    try {
      return localStorage.getItem(LS_ACTIVE_PROFILE_ID) || "";
    } catch {
      return "";
    }
  });

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || null;
  }, [profiles, activeProfileId]);

  const workoutsKey = useMemo(() => {
    return activeProfileId ? `${LS_WORKOUTS_PREFIX}${activeProfileId}` : "";
  }, [activeProfileId]);

  const [workouts, setWorkouts] = useState(() => {
    // inizialmente vuoto: lo ricarichiamo quando abbiamo activeProfileId
    return [];
  });

  // Persist profiles + active id
  useEffect(() => {
    try {
      localStorage.setItem(LS_PROFILES, JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  useEffect(() => {
    try {
      if (activeProfileId) localStorage.setItem(LS_ACTIVE_PROFILE_ID, activeProfileId);
      else localStorage.removeItem(LS_ACTIVE_PROFILE_ID);
    } catch {}
  }, [activeProfileId]);

  // Load workouts when profile changes
  useEffect(() => {
    if (!workoutsKey) {
      setWorkouts([]);
      return;
    }
    try {
      const raw = localStorage.getItem(workoutsKey);
      setWorkouts(raw ? JSON.parse(raw) : []);
    } catch {
      setWorkouts([]);
    }
  }, [workoutsKey]);

  // Persist workouts (per profilo)
  useEffect(() => {
    if (!workoutsKey) return;
    try {
      localStorage.setItem(workoutsKey, JSON.stringify(workouts));
    } catch {}
  }, [workoutsKey, workouts]);

  const isAuthed = !!activeProfile;

  // Guard
  useEffect(() => {
    if (!isAuthed && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
    if (isAuthed && location.pathname === "/login") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthed, location.pathname, navigate]);

  // CRUD workouts
  const addWorkout = (w) => {
    setWorkouts((prev) => {
      const next = [w, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1));
      return next;
    });
  };
  const updateWorkout = (id, patch) => {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };
  const deleteWorkout = (id) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  // Profiles actions
  const createProfile = (name) => {
    const n = name.trim();
    if (!n) return;
    const p = { id: uid(), name: n, createdAt: Date.now() };
    setProfiles((prev) => [p, ...prev]);
  };
  const enterProfile = (id) => setActiveProfileId(id);
  const deleteProfile = (id) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    try {
      localStorage.removeItem(`${LS_WORKOUTS_PREFIX}${id}`);
    } catch {}
    if (activeProfileId === id) setActiveProfileId("");
  };
  const logout = () => {
    setActiveProfileId("");
    setWorkouts([]);
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.app}>
      {isAuthed && <TopBar userName={activeProfile?.name} onLogout={logout} />}
      <div style={styles.container}>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage
                profiles={profiles}
                onCreateProfile={createProfile}
                onEnter={enterProfile}
                onDelete={deleteProfile}
              />
            }
          />

          <Route
            path="/dashboard"
            element={
              <Authed isAuthed={isAuthed}>
                <DashboardPage
                  workouts={workouts}
                  onAddWorkout={addWorkout}
                  onUpdateWorkout={updateWorkout}
                  onDeleteWorkout={deleteWorkout}
                />
              </Authed>
            }
          />

          <Route
            path="/stats"
            element={
              <Authed isAuthed={isAuthed}>
                <StatsPage workouts={workouts} />
              </Authed>
            }
          />

          <Route
            path="/progress"
            element={
              <Authed isAuthed={isAuthed}>
                <ProgressPage workouts={workouts} />
              </Authed>
            }
          />

          <Route
            path="/search"
            element={
              <Authed isAuthed={isAuthed}>
                <SearchPage
                  workouts={workouts}
                  onOpenDate={(dateISO) => navigate("/dashboard", { state: { focusDate: dateISO } })}
                />
              </Authed>
            }
          />

          <Route path="*" element={<Navigate to={isAuthed ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ---------------- Components ----------------
function Authed({ isAuthed, children }) {
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

function TopBar({ userName, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname;

  return (
    <div style={styles.topbar}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={styles.brand}>Progetto Palestra 2</div>
        <div style={styles.badge}>v2</div>
      </div>

      <div style={styles.navRow}>
        {PAGE_FLOW.filter((p) => p.path !== "/login").map((p) => (
          <button
            key={p.path}
            onClick={() => navigate(p.path)}
            style={{ ...styles.navBtn, ...(active === p.path ? styles.navBtnActive : null) }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={styles.userChip}>
          <div style={{ fontWeight: 900 }}>{userName}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Profilo</div>
        </div>
        <button onClick={onLogout} style={styles.ghostBtn}>
          Esci
        </button>
      </div>
    </div>
  );
}

function PageNav() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/login") return null;

  const idx = PAGE_FLOW.findIndex((p) => p.path === location.pathname);
  const prev = idx > 0 ? PAGE_FLOW[idx - 1] : null;
  const next = idx >= 0 && idx < PAGE_FLOW.length - 1 ? PAGE_FLOW[idx + 1] : null;

  return (
    <div style={styles.pageNav}>
      <button
        style={{ ...styles.pageNavBtn, opacity: prev ? 1 : 0.4 }}
        disabled={!prev}
        onClick={() => prev && navigate(prev.path)}
      >
        ← Pagina precedente
      </button>

      <div style={{ fontSize: 12, opacity: 0.8 }}>{PAGE_FLOW[idx]?.label || ""}</div>

      <button
        style={{ ...styles.pageNavBtn, opacity: next ? 1 : 0.4 }}
        disabled={!next}
        onClick={() => next && navigate(next.path)}
      >
        Prossima pagina →
      </button>
    </div>
  );
}

// ---------------- PAGE 1: Login (sx registrazione, dx profili) ----------------
function LoginPage({ profiles, onCreateProfile, onEnter, onDelete }) {
  const [name, setName] = useState("");

  return (
    <div style={styles.pageWrap}>
      <div style={styles.loginGrid}>
        {/* SINISTRA: registrazione */}
        <div style={styles.card}>
          <h2 style={styles.h2}>Registrazione</h2>
          <p style={styles.p}>Crea un nuovo profilo.</p>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome profilo (es. Gabriele)"
              style={styles.input}
            />
            <button
              style={styles.primaryBtn}
              onClick={() => {
                const n = name.trim();
                if (!n) return;
                onCreateProfile(n);
                setName("");
              }}
            >
              Crea
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Dopo la creazione lo trovi a destra e puoi entrare.
          </div>
        </div>

        {/* DESTRA: profili già registrati */}
        <div style={styles.card}>
          <h2 style={styles.h2}>Profili registrati</h2>

          {profiles.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Nessun profilo. Creane uno a sinistra.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {profiles.map((p) => (
                <div key={p.id} style={styles.profileRow}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{p.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      creato: {new Date(p.createdAt).toLocaleDateString("it-IT")}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={styles.primaryBtn} onClick={() => onEnter(p.id)}>
                      Entra
                    </button>
                    <button style={styles.dangerBtn} onClick={() => onDelete(p.id)}>
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Elimina profilo = elimina anche i suoi allenamenti salvati.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- PAGE 2: Dashboard (calendario + salva + modifica) ----------------
function DashboardPage({ workouts, onAddWorkout, onUpdateWorkout, onDeleteWorkout }) {
  const location = useLocation();
  const focusDateFromState = location.state?.focusDate || null;

  const [selectedDate, setSelectedDate] = useState(focusDateFromState || todayISO());

  // Draft (creazione/modifica)
  const [editId, setEditId] = useState(null); // se non null, stiamo modificando un workout esistente
  const [title, setTitle] = useState("Allenamento");
  const [notes, setNotes] = useState("");

  // Exercise picker
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [pickedExercise, setPickedExercise] = useState("");

  // Campi richiesti: RIP / SERIE / KG
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);
  const [kg, setKg] = useState(20);

  const [draftExercises, setDraftExercises] = useState([]);

  useEffect(() => {
    if (focusDateFromState) setSelectedDate(focusDateFromState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDateFromState]);

  // Costruisci lista esercizi: default + quelli già usati
  const allExercises = useMemo(() => {
    const used = new Set();
    for (const w of workouts) {
      for (const ex of w.exercises || []) used.add(ex.name);
    }
    const merged = [...DEFAULT_EXERCISES, ...Array.from(used)];
    // unique
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    if (!q) return allExercises;
    return allExercises.filter((e) => e.toLowerCase().includes(q));
  }, [allExercises, exerciseSearch]);

  const workoutsOnSelected = useMemo(
    () => workouts.filter((w) => w.date === selectedDate),
    [workouts, selectedDate]
  );

  // calendario mese
  const monthWorkouts = useMemo(() => workouts.filter((w) => isSameMonth(w.date, selectedDate)), [workouts, selectedDate]);
  const hasWorkoutByDate = useMemo(() => {
    const map = new Map();
    for (const w of monthWorkouts) map.set(w.date, (map.get(w.date) || 0) + 1);
    return map;
  }, [monthWorkouts]);

  const calendarDays = useMemo(() => {
    const d = parseISO(selectedDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    const startWeekday = (first.getDay() + 6) % 7; // lun=0
    const totalDays = last.getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= totalDays; day++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      cells.push(`${year}-${mm}-${dd}`);
    }
    return cells;
  }, [selectedDate]);

  const addExerciseToDraft = () => {
    const name = (pickedExercise || "").trim();
    if (!name) return;

    const item = {
      id: uid(),
      name,
      reps: Number(reps) || 0,
      sets: Number(sets) || 0,
      kg: Number(kg) || 0,
    };

    setDraftExercises((prev) => [item, ...prev]);
  };

  const removeDraftExercise = (id) => {
    setDraftExercises((prev) => prev.filter((x) => x.id !== id));
  };

  const saveNewWorkout = () => {
    if (!selectedDate) return;

    const w = {
      id: uid(),
      date: selectedDate,
      title: title.trim() || "Allenamento",
      notes: notes.trim(),
      exercises: draftExercises.map(({ id, ...rest }) => rest),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onAddWorkout(w);
    resetDraft();
  };

  const saveEditWorkout = () => {
    if (!editId) return;

    onUpdateWorkout(editId, {
      date: selectedDate,
      title: title.trim() || "Allenamento",
      notes: notes.trim(),
      exercises: draftExercises.map(({ id, ...rest }) => rest),
      updatedAt: Date.now(),
    });

    resetDraft();
  };

  const resetDraft = () => {
    setEditId(null);
    setTitle("Allenamento");
    setNotes("");
    setExerciseSearch("");
    setPickedExercise("");
    setReps(10);
    setSets(3);
    setKg(20);
    setDraftExercises([]);
  };

  const startEdit = (w) => {
    setEditId(w.id);
    setSelectedDate(w.date);
    setTitle(w.title || "Allenamento");
    setNotes(w.notes || "");
    setDraftExercises((w.exercises || []).map((ex) => ({ id: uid(), ...ex })));
    // lascia picker così com'è
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={styles.pageWrap}>
      <PageNav />

      <div style={styles.grid2}>
        {/* Calendario */}
        <div style={styles.card}>
          <h2 style={styles.h2}>Calendario</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={styles.input} />
            <div style={{ fontSize: 12, opacity: 0.8 }}>{formatDateIT(selectedDate)}</div>
          </div>

          <div style={styles.calendarHeader}>
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((x) => (
              <div key={x} style={styles.calendarHeadCell}>
                {x}
              </div>
            ))}
          </div>

          <div style={styles.calendarGrid}>
            {calendarDays.map((iso, i) => {
              if (!iso) return <div key={i} style={styles.calendarEmpty} />;
              const active = iso === selectedDate;
              const count = hasWorkoutByDate.get(iso) || 0;

              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  style={{ ...styles.calendarCell, ...(active ? styles.calendarCellActive : null) }}
                >
                  <div style={{ fontWeight: 800 }}>{parseISO(iso).getDate()}</div>
                  {count > 0 && <div style={styles.dot}>{count}</div>}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 12 }}>
            <h3 style={styles.h3}>Allenamenti del giorno</h3>

            {workoutsOnSelected.length === 0 ? (
              <div style={{ opacity: 0.75 }}>Nessun allenamento in questa data.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {workoutsOnSelected.map((w) => (
                  <div key={w.id} style={styles.workoutCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 950 }}>{w.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          {formatDateIT(w.date)} · {(w.exercises || []).length} esercizi
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={styles.primaryBtn} onClick={() => startEdit(w)}>
                          Modifica
                        </button>
                        <button style={styles.dangerBtn} onClick={() => onDeleteWorkout(w.id)}>
                          Elimina
                        </button>
                      </div>
                    </div>

                    {w.notes ? <div style={{ marginTop: 8, opacity: 0.9 }}>{w.notes}</div> : null}

                    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                      {(w.exercises || []).map((ex, idx) => (
                        <div key={idx} style={styles.exRow}>
                          <div style={{ fontWeight: 850 }}>{ex.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.85 }}>
                            {ex.sets} serie · {ex.reps} rip · {ex.kg} kg
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aggiunta/Modifica */}
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <h2 style={styles.h2}>{editId ? "Modifica allenamento" : "Aggiungi allenamento"}</h2>
            {editId ? (
              <button style={styles.ghostBtn} onClick={resetDraft}>
                Annulla modifica
              </button>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={styles.label}>Titolo</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} />

            <label style={styles.label}>Note</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={styles.textarea} />

            <div style={styles.hr} />

            <h3 style={styles.h3}>Esercizi</h3>

            {/* Picker esercizi scrollabile */}
            <div style={styles.pickerWrap}>
              <div style={styles.pickerLeft}>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={styles.label}>Cerca esercizio</label>
                  <input
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Scrivi per filtrare (es. panca)"
                    style={styles.input}
                  />
                </div>

                <div style={styles.exerciseList}>
                  {filteredExercises.map((ex) => {
                    const active = ex === pickedExercise;
                    return (
                      <button
                        key={ex}
                        onClick={() => setPickedExercise(ex)}
                        style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }}
                      >
                        {ex}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inserimento RIP / SERIE / KG */}
              <div style={styles.pickerRight}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>
                  Selezionato:{" "}
                  <span style={{ opacity: 0.9 }}>{pickedExercise ? pickedExercise : "—"}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={styles.smallLabel}>RIP</div>
                    <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} style={styles.input} min={0} />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={styles.smallLabel}>SERIE</div>
                    <input type="number" value={sets} onChange={(e) => setSets(e.target.value)} style={styles.input} min={0} />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={styles.smallLabel}>KG</div>
                    <input type="number" value={kg} onChange={(e) => setKg(e.target.value)} style={styles.input} min={0} />
                  </div>
                </div>

                <button style={{ ...styles.primaryBtn, marginTop: 12 }} onClick={addExerciseToDraft}>
                  Aggiungi esercizio
                </button>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                  (SPINGERE!)
                </div>
              </div>
            </div>

            {/* Lista bozza */}
            {draftExercises.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {draftExercises.map((ex) => (
                  <div key={ex.id} style={styles.workoutCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 950 }}>{ex.name}</div>
                      <button style={styles.ghostBtn} onClick={() => removeDraftExercise(ex.id)}>
                        Rimuovi
                      </button>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      {ex.sets} serie · {ex.reps} rip · {ex.kg} kg
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TASTO SALVA */}
            {!editId ? (
              <button
                style={{ ...styles.primaryBtn, padding: "12px 14px", fontWeight: 950 }}
                onClick={saveNewWorkout}
              >
                Salva allenamento
              </button>
            ) : (
              <button
                style={{ ...styles.primaryBtn, padding: "12px 14px", fontWeight: 950 }}
                onClick={saveEditWorkout}
              >
                Salva modifiche
              </button>
            )}
          </div>

          {/* Assistente sotto (placeholder) */}
          <div style={{ marginTop: 16, ...styles.assistantBox }}>
            <div style={{ fontWeight: 950, marginBottom: 6 }}>Assistente</div>
            <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                IN MANUTENZIONE APP DI VARUTTI GABRIELE
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- PAGE 3: Stats ----------------
function StatsPage({ workouts }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`; // YYYY-MM
  });

  const filtered = useMemo(() => {
    const [y, m] = month.split("-").map((x) => parseInt(x, 10));
    return workouts.filter((w) => {
      const d = parseISO(w.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  }, [workouts, month]);

  const totalMonth = filtered.length;

  const exCounts = useMemo(() => {
    const map = new Map();
    for (const w of filtered) {
      for (const ex of w.exercises || []) {
        const k = ex.name.trim();
        map.set(k, (map.get(k) || 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const volumeByExercise = useMemo(() => {
    const map = new Map();
    for (const w of filtered) {
      for (const ex of w.exercises || []) {
        const k = ex.name.trim();
        map.set(k, (map.get(k) || 0) + calcExerciseVolume(ex));
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return (
    <div style={styles.pageWrap}>
      <PageNav />
      <div style={styles.grid2}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Statistiche semplici</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <label style={styles.label}>Mese</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={styles.input} />
          </div>

          <div style={styles.kpiRow}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Totale allenamenti mese</div>
              <div style={styles.kpiValue}>{totalMonth}</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Esercizi unici</div>
              <div style={styles.kpiValue}>{exCounts.length}</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.h3}>Esercizi più usati</h3>
          {exCounts.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Nessun dato nel mese selezionato.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {exCounts.slice(0, 12).map(([name, count]) => (
                <div key={name} style={styles.row}>
                  <div style={{ fontWeight: 900 }}>{name}</div>
                  <div style={styles.pill}>{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.h3}>Volume per esercizio (SERIE × RIP × KG)</h3>
          {volumeByExercise.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Nessun dato nel mese selezionato.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {volumeByExercise.slice(0, 12).map(([name, vol]) => (
                <div key={name} style={styles.row}>
                  <div style={{ fontWeight: 900 }}>{name}</div>
                  <div style={styles.pill}>{Math.round(vol)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={{ opacity: 0.85, lineHeight: 1.5 }}>
            Qui è tutto automatico: ogni modifica di un allenamento aggiorna subito queste statistiche.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- PAGE 4: Progress ----------------
function ProgressPage({ workouts }) {
  const [exerciseQuery, setExerciseQuery] = useState("Panca");
  const allExerciseNames = useMemo(() => {
    const set = new Set();
    for (const w of workouts) for (const ex of w.exercises || []) set.add(ex.name);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  const matchedNames = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return allExerciseNames.slice(0, 30);
    return allExerciseNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 30);
  }, [allExerciseNames, exerciseQuery]);

  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!selected && matchedNames.length > 0) setSelected(matchedNames[0]);
    if (selected && matchedNames.length > 0 && !matchedNames.includes(selected)) setSelected(matchedNames[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedNames.join("|")]);

  const last30 = useMemo(() => {
    const days = lastNDaysISO(30);
    return { start: days[0], end: days[days.length - 1], days };
  }, []);

  const points = useMemo(() => {
    if (!selected) return [];
    const byDay = new Map();

    for (const w of workouts) {
      if (w.date < last30.start || w.date > last30.end) continue;
      for (const ex of w.exercises || []) {
        if (ex.name !== selected) continue;
        const score = bestSetScoreFromSimple(ex); // kg*reps
        const prev = byDay.get(w.date);
        if (!prev || score > prev.score) byDay.set(w.date, { date: w.date, score, kg: ex.kg, reps: ex.reps });
      }
    }

    return last30.days.map((d) => byDay.get(d) || null).filter(Boolean);
  }, [workouts, selected, last30.start, last30.end, last30.days]);

  const pr = useMemo(() => {
    if (!selected) return null;
    let best = null;
    for (const w of workouts) {
      for (const ex of w.exercises || []) {
        if (ex.name !== selected) continue;
        const score = bestSetScoreFromSimple(ex);
        if (!best || score > best.score) best = { date: w.date, score, kg: ex.kg, reps: ex.reps, sets: ex.sets };
      }
    }
    return best;
  }, [workouts, selected]);

  return (
    <div style={styles.pageWrap}>
      <PageNav />
      <div style={styles.grid2}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Progressione carichi</h2>
          <input
            value={exerciseQuery}
            onChange={(e) => setExerciseQuery(e.target.value)}
            style={styles.input}
            placeholder="Cerca esercizio"
          />

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {matchedNames.length === 0 ? (
              <div style={{ opacity: 0.75 }}>Nessun esercizio trovato.</div>
            ) : (
              matchedNames.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelected(n)}
                  style={{ ...styles.listBtn, ...(selected === n ? styles.listBtnActive : null) }}
                >
                  {n}
                </button>
              ))
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.h3}>Grafico ultimo mese — {selected || "seleziona esercizio"}</h3>

          {!selected || points.length === 0 ? (
            <div style={{ opacity: 0.75, lineHeight: 1.5 }}>
              Nessun dato negli ultimi 30 giorni per questo esercizio.
            </div>
          ) : (
            <MiniLineChart points={points} />
          )}

          <div style={{ marginTop: 12, ...styles.workoutCard }}>
            <div style={{ fontWeight: 950 }}>Best set / PR</div>
            {pr ? (
              <div style={{ marginTop: 6, opacity: 0.92 }}>
                {selected}: <b>{pr.reps} rip · {pr.kg} kg</b> (score {Math.round(pr.score)}) — {formatDateIT(pr.date)}
              </div>
            ) : (
              <div style={{ marginTop: 6, opacity: 0.75 }}>Nessun PR disponibile.</div>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Score = kg × rip
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniLineChart({ points }) {
  const w = 640;
  const h = 220;
  const pad = 24;

  const scores = points.map((p) => p.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const ys = points.map((p) => {
    const t = (p.score - min) / range;
    return h - pad - t * (h - pad * 2);
  });

  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {[0.25, 0.5, 0.75].map((t) => {
          const y = h - pad - t * (h - pad * 2);
          return <line key={t} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.07)" />;
        })}
        <path d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="4.2" fill="rgba(255,255,255,0.95)" />
        ))}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        <div>Min: {Math.round(min)}</div>
        <div>Max: {Math.round(max)}</div>
        <div>Dati: {points.length}</div>
      </div>
    </div>
  );
}

// ---------------- PAGE 5: Search ----------------
function SearchPage({ workouts, onOpenDate }) {
  const [q, setQ] = useState("panca");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];

    const out = [];
    for (const w of workouts) {
      const hitTitle = (w.title || "").toLowerCase().includes(query);
      const hitNotes = (w.notes || "").toLowerCase().includes(query);
      const hitExercises = (w.exercises || []).some((ex) => ex.name.toLowerCase().includes(query));
      if (hitTitle || hitNotes || hitExercises) {
        const matchedEx = (w.exercises || []).filter((ex) => ex.name.toLowerCase().includes(query));
        out.push({ w, matchedEx });
      }
    }
    out.sort((a, b) => (a.w.date < b.w.date ? 1 : -1));
    return out;
  }, [workouts, q]);

  return (
    <div style={styles.pageWrap}>
      <PageNav />
      <div style={styles.card}>
        <h2 style={styles.h2}>Ricerca</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Es. "panca"' style={styles.input} />
          <div style={{ fontSize: 12, opacity: 0.8 }}>Risultati: {results.length}</div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {q.trim() && results.length === 0 ? <div style={{ opacity: 0.75 }}>Nessuna sessione trovata.</div> : null}

          {results.map(({ w, matchedEx }) => (
            <div key={w.id} style={styles.workoutCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 950 }}>{w.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{formatDateIT(w.date)}</div>
                </div>
                <button style={styles.primaryBtn} onClick={() => onOpenDate(w.date)}>
                  Vai a quel giorno
                </button>
              </div>

              {matchedEx.length > 0 && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {matchedEx.map((ex, i) => (
                    <div key={i} style={styles.exRow}>
                      <div style={{ fontWeight: 850 }}>{ex.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        {ex.sets} serie · {ex.reps} rip · {ex.kg} kg
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {w.notes ? <div style={{ marginTop: 8, opacity: 0.85 }}>{w.notes}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Styles ----------------
const styles = {
  app: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 700px at 20% 0%, rgba(255,255,255,0.08), transparent 55%), #0b0c10",
  },
  // full width, niente “bordino”
  container: {
    width: "100%",
    maxWidth: "none",
    padding: "16px",
    boxSizing: "border-box",
  },

  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: "12px 16px",
    backdropFilter: "blur(10px)",
    background: "rgba(10, 11, 15, 0.7)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  brand: { fontWeight: 950, letterSpacing: 0.2 },
  badge: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  navRow: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  navBtn: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
  },
  navBtnActive: {
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.22)",
  },
  userChip: {
    padding: "8px 10px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "right",
    minWidth: 120,
  },

  pageWrap: { display: "grid", gap: 14 },
  loginGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },

  card: {
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  h2: { margin: 0, marginBottom: 8, fontSize: 22, fontWeight: 950 },
  h3: { margin: 0, marginBottom: 8, fontSize: 16, fontWeight: 950 },
  p: { margin: 0, opacity: 0.85, lineHeight: 1.5 },
  label: { fontSize: 12, opacity: 0.85, fontWeight: 900 },
  smallLabel: { fontSize: 12, opacity: 0.9, fontWeight: 950 },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    minHeight: 90,
    resize: "vertical",
    boxSizing: "border-box",
  },

  primaryBtn: {
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.14)",
    color: "white",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 950,
    whiteSpace: "nowrap",
  },
  ghostBtn: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  dangerBtn: {
    border: "1px solid rgba(255, 90, 90, 0.35)",
    background: "rgba(255, 90, 90, 0.16)",
    color: "white",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  hr: { height: 1, background: "rgba(255,255,255,0.10)", margin: "10px 0" },

  workoutCard: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  exRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },

  assistantBox: {
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px dashed rgba(255,255,255,0.18)",
  },

  // calendar
  calendarHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 8,
    marginBottom: 8,
  },
  calendarHeadCell: { fontSize: 12, opacity: 0.8, textAlign: "center", fontWeight: 900 },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 },
  calendarEmpty: {
    height: 54,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(255,255,255,0.02)",
  },
  calendarCell: {
    height: 54,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 10px",
  },
  calendarCellActive: {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.20)",
  },
  dot: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 950,
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "0 6px",
  },

  // picker
  pickerWrap: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 12,
    alignItems: "start",
  },
  pickerLeft: { display: "grid", gap: 10 },
  pickerRight: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  exerciseList: {
    maxHeight: 320,
    overflow: "auto",
    display: "grid",
    gap: 8,
    paddingRight: 6,
  },

  listBtn: {
    textAlign: "left",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 900,
  },
  listBtnActive: {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.22)",
  },

  // stats
  kpiRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 },
  kpiCard: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  kpiLabel: { fontSize: 12, opacity: 0.8, fontWeight: 900 },
  kpiValue: { fontSize: 28, fontWeight: 950, marginTop: 6 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  pill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 950,
    fontSize: 12,
  },

  // page nav
  pageNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  pageNavBtn: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 950,
  },

  profileRow: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
};
