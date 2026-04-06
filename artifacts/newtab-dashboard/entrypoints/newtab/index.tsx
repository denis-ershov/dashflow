import React from "react";
import ReactDOM from "react-dom/client";
import "../../src/index.css";
import NewTabDashboard from "../../src/components/dashboard/NewTabDashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NewTabDashboard />
  </React.StrictMode>
);
