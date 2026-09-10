import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import '@/lib/i18n';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>
);
