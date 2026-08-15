import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

// Mounts the React application inside the root element in index.html.
createRoot(document.getElementById("root")).render(
  // Strict Mode helps find unsafe React code during development.
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
