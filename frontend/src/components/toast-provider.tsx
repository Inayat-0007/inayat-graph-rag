"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "hsl(228 14% 12%)",
          color: "hsl(210 20% 93%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          fontSize: "13px",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
          padding: "12px 16px",
        },
        success: {
          iconTheme: {
            primary: "#34d399",
            secondary: "hsl(228 14% 12%)",
          },
          style: {
            borderColor: "rgba(52,211,153,0.2)",
          },
        },
        error: {
          iconTheme: {
            primary: "#fb7185",
            secondary: "hsl(228 14% 12%)",
          },
          style: {
            borderColor: "rgba(244,63,94,0.2)",
          },
          duration: 6000,
        },
      }}
    />
  );
}
