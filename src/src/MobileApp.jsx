import { NavLink, Routes, Route, Navigate } from "react-router-dom";

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
        fontWeight: 700,
      })}
    >
      {label}
    </NavLink>
  );
}

function Screen({ title }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 12px 0" }}>{title}</h2>
      <p style={{ opacity: 0.85, margin: 0 }}>Schermata mobile in costruzione.</p>
    </div>
  );
}

export default function MobileApp() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0f14", color: "white" }}>
      <div style={{ paddingBottom: 70 }}>
        <Routes>
          <Route path="/m" element={<Screen title="Home" />} />
          <Route path="/m/workouts" element={<Screen title="Allenamenti" />} />
          <Route path="/m/stats" element={<Screen title="Statistiche" />} />
          <Route path="/m/profile" element={<Screen title="Profilo" />} />
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