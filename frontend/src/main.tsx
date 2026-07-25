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
            borderRadius: "18px",
            padding: "16px",
            fontWeight: 600,
            border: "1px solid #e2e8f0",
          },

          success: {
            style: {
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #6ee7b7",
            },
          },

          error: {
            style: {
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
            },
          },
        }}
      />
    </ThemeProvider>
  </StrictMode>
);