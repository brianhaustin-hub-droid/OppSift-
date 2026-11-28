import React from "react";
import ReactDOM from "react-dom/client";
import UiApp from "./src/ui/App";
import "./src/ui/index.css";

// The auth and organisation providers are mounted inside the modules that need
// them (sign-in and the workspace), so a visitor to the public website makes no
// session request and mounts no account state.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UiApp />
  </React.StrictMode>,
);
