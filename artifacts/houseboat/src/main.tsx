import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { API_ORIGIN } from "./lib/api-config";

// Point the generated API client at the VPS backend.
// In dev (no VITE_API_URL set) this is "" which keeps same-origin behaviour.
// In production this is e.g. "https://api.yourdomain.com".
setBaseUrl(API_ORIGIN || null);

createRoot(document.getElementById("root")!).render(<App />);
