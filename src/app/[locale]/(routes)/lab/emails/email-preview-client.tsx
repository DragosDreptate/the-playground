"use client";

import { useMemo, useState } from "react";

export type PreviewLocale = "fr" | "en";

export type EmailGroupId = "participant" | "members" | "host" | "account" | "admin";

export type EmailPreview = {
  id: string;
  group: EmailGroupId;
  label: string;
  /** Qui reçoit cet email, en clair. */
  recipient: string;
  subject: string;
  html: string;
  /** "fr-only" : email interne, jamais traduit (affiché dans les deux langues). */
  locale: PreviewLocale | "fr-only";
};

const GROUPS: { id: EmailGroupId; title: string; hint: string }[] = [
  { id: "participant", title: "Participant", hint: "Son inscription à un événement" },
  { id: "members", title: "Membres de la Communauté", hint: "Annonces, événements, adhésion" },
  { id: "host", title: "Organisateur", hint: "Ce qui se passe dans sa Communauté" },
  { id: "account", title: "Connexion et compte", hint: "Lien de connexion, bienvenue" },
  { id: "admin", title: "Admin (interne)", hint: "Équipe The Playground, en français uniquement" },
];

const LOCALE_LABELS: Record<PreviewLocale, string> = { fr: "Français", en: "English" };

export function EmailPreviewClient({ previews }: { previews: EmailPreview[] }) {
  const [locale, setLocale] = useState<PreviewLocale>("fr");
  const [selectedId, setSelectedId] = useState(previews[0]?.id ?? "");

  const visible = useMemo(
    () => previews.filter((p) => p.locale === locale || p.locale === "fr-only"),
    [previews, locale]
  );
  // Même email d'une langue à l'autre : la sélection survit au changement de langue.
  const current = visible.find((p) => p.id === selectedId) ?? visible[0];
  const total = new Set(previews.map((p) => p.id)).size;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif", background: "#f4f4f5" }}>
      {/* Barre latérale : emails rangés par destinataire */}
      <aside style={{ width: "300px", flexShrink: 0, background: "#18181b", color: "#e4e4e7", overflowY: "auto" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #27272a", position: "sticky", top: 0, background: "#18181b", zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Emails envoyés
          </p>
          <p style={{ margin: "4px 0 12px", fontSize: "12px", color: "#71717a" }}>
            {total} emails, textes tirés des fichiers de traduction
          </p>
          <div role="radiogroup" aria-label="Langue de l'aperçu" style={{ display: "flex", background: "#27272a", borderRadius: "8px", padding: "3px" }}>
            {(Object.keys(LOCALE_LABELS) as PreviewLocale[]).map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={locale === l}
                onClick={() => setLocale(l)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: locale === l ? "#ec4899" : "transparent",
                  color: locale === l ? "#ffffff" : "#a1a1aa",
                }}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <nav style={{ padding: "8px 0 24px" }}>
          {GROUPS.map((group) => {
            const items = visible.filter((p) => p.group === group.id);
            if (items.length === 0) return null;
            return (
              <section key={group.id} style={{ marginTop: "12px" }}>
                <div style={{ padding: "0 16px 6px" }}>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#f4f4f5" }}>
                    {group.title} <span style={{ color: "#71717a", fontWeight: 500 }}>· {items.length}</span>
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#71717a" }}>{group.hint}</p>
                </div>
                {items.map((p) => {
                  const active = current?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "7px 16px 7px 14px",
                        background: active ? "#27272a" : "transparent",
                        color: active ? "#f4f4f5" : "#a1a1aa",
                        border: "none",
                        borderLeft: active ? "2px solid #ec4899" : "2px solid transparent",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </section>
            );
          })}
        </nav>
      </aside>

      {/* Aperçu */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {current && (
          <>
            <div style={{ padding: "14px 20px", background: "#ffffff", borderBottom: "1px solid #e4e4e7", display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "12px", rowGap: "6px", alignItems: "baseline" }}>
              <span style={{ gridColumn: "1 / -1", fontSize: "15px", fontWeight: 600, color: "#18181b" }}>
                {current.label}
                <span style={{ marginLeft: "10px", fontSize: "11px", fontWeight: 600, color: current.locale === "fr-only" ? "#a16207" : "#be185d", background: current.locale === "fr-only" ? "#fef9c3" : "#fce7f3", padding: "2px 8px", borderRadius: "999px" }}>
                  {current.locale === "fr-only" ? "FR uniquement (interne)" : LOCALE_LABELS[current.locale]}
                </span>
              </span>
              <Field label="Sujet" value={current.subject} />
              <Field label="Reçu par" value={current.recipient} />
              <Field label="Identifiant" value={current.id} muted />
            </div>
            <iframe
              key={`${current.locale}:${current.id}`}
              srcDoc={current.html}
              style={{ flex: 1, border: "none", background: "#f4f4f5" }}
              title={current.label}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <>
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", color: muted ? "#a1a1aa" : "#27272a" }}>{value}</span>
    </>
  );
}
