import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./src/app/auth/AuthProvider";
import { OrganizationProvider } from "./src/app/organizations/OrganizationProvider";
import UiApp from "./src/ui/App";
import "./src/ui/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <OrganizationProvider>
        <UiApp />
      </OrganizationProvider>
    </AuthProvider>
  </React.StrictMode>,
);
