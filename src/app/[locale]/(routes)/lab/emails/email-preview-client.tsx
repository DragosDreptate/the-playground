"use client";

import { useState } from "react";

type Template = { id: string; label: string; html: string };

export function EmailPreviewClient({ templates }: { templates: Template[] }) {
  const [selected, setSelected] = useState(templates[0]?.id ?? "");

  const current = templates.find((t) => t.id === selected);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif", background: "#f4f4f5" }}>
      {/* Sidebar */}
      <aside style={{
        width: "260px",
        flexShrink: 0,
        background: "#18181b",
        color: "#e4e4e7",
        overflowY: "auto",
        padding: "16px 0",
      }}>
        <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #27272a" }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Email Templates
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#52525b" }}>
            {templates.length} templates
          </p>
        </div>
        <nav style={{ padding: "8px 0" }}>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 16px",
                background: selected === t.id ? "#27272a" : "transparent",
                color: selected === t.id ? "#f4f4f5" : "#a1a1aa",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                borderLeft: selected === t.id ? "2px solid #ec4899" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Preview */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{
          padding: "12px 20px",
          background: "#ffffff",
          borderBottom: "1px solid #e4e4e7",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#18181b" }}>
            {current?.label}
          </span>
          <span style={{ fontSize: "12px", color: "#71717a" }}>
            {current?.id}
          </span>
        </div>

        {/* Iframe */}
        {current && (
          <iframe
            key={current.id}
            srcDoc={current.html}
            style={{ flex: 1, border: "none", background: "#f4f4f5" }}
            title={current.label}
          />
        )}
      </main>
    </div>
  );
}
