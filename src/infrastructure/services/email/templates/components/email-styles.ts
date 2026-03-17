import type React from "react";

// ---------------------------------------------------------------------------
// CTA button — gradient rose→violet, partagé par 15+ templates
// Exceptions : magic-link (padding plus large), circle-invitation (display block)
// ---------------------------------------------------------------------------
export const ctaButton: React.CSSProperties = {
  backgroundColor: "#ec4899",
  backgroundImage: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 32px",
  textDecoration: "none",
  display: "inline-block",
};

// ---------------------------------------------------------------------------
// Titre d'événement — version standard (sombre)
// Exception : moment-cancelled utilise sa propre version (grise + barrée)
// ---------------------------------------------------------------------------
export const title: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  lineHeight: "28px",
};

// ---------------------------------------------------------------------------
// Heading — deux variantes selon le contexte
// headingSm : margin 8px  → templates événement (inscription, rappel, annulation…)
// headingLg : margin 16px → templates notification (admin, commentaire, inscription host…)
// ---------------------------------------------------------------------------
export const headingSm: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 8px 0",
  lineHeight: "24px",
};

export const headingLg: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 16px 0",
  lineHeight: "24px",
};

// ---------------------------------------------------------------------------
// Section meta date/lieu — partagée par 7 templates
// ---------------------------------------------------------------------------
export const metaSection: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  paddingTop: "16px",
  marginBottom: "24px",
};

export const metaRow: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  margin: "0 0 12px 0",
  lineHeight: "20px",
};

export const metaLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

export const metaValue: React.CSSProperties = {
  color: "#18181b",
  fontSize: "14px",
  fontWeight: 500,
};

// ---------------------------------------------------------------------------
// Carte info — templates admin (admin-entity-created, admin-new-user)
// ---------------------------------------------------------------------------
export const infoCard: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

export const infoLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "8px 0 2px 0",
};

export const infoValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  fontWeight: 500,
  margin: "0 0 4px 0",
};

// ---------------------------------------------------------------------------
// Section commentaire — templates new-comment, host-new-comment
// ---------------------------------------------------------------------------
export const commentSection: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

export const commentLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 6px 0",
};

export const commentText: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  margin: "0",
  lineHeight: "22px",
  fontStyle: "italic",
};

// ---------------------------------------------------------------------------
// Section stats — templates host-new-registration, host-new-circle-member
// ---------------------------------------------------------------------------
export const statsSection: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

export const statsText: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  fontWeight: 500,
  margin: "0",
  textAlign: "center" as const,
};

// ---------------------------------------------------------------------------
// Lien de désabonnement — templates new-moment-notification, broadcast-moment
// ---------------------------------------------------------------------------
export const unsubscribeRow: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0",
};

export const unsubscribeLink: React.CSSProperties = {
  color: "#a1a1aa",
  textDecoration: "underline",
};
