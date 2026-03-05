import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import MobileApp from "./MobileApp.jsx";

const isMobileRoute = window.location.pathname.startsWith("/m");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {isMobileRoute ? <MobileApp /> : <App />}
    </BrowserRouter>
  </React.StrictMode>
);