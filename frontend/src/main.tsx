import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";

import "./index.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />

      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3500,

          style: {
            borderRadius: "4px",
            padding: "12px 16px",
            fontWeight: 600,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
          },

          success: {
            style: {
              background: "#18302b",
              color: "#a6ede5",
              border: "1px solid #33574e",
            },
          },

          error: {
            style: {
              background: "#301e22",
              color: "#ffb2b2",
              border: "1px solid #704344",
            },
          },
        }}
      />
    </ThemeProvider>
  </StrictMode>
);
