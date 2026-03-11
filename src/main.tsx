import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { logger } from "@/lib/logger";

window.addEventListener("error", (event) => {
  logger.error("Window error:", event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
