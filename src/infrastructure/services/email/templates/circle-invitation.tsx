import {
  Html,
  Head,
  Body,
  Container,
  Preview,
  Text,
  Button,
  Link,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";
import type { CircleInvitationEmailData } from "@/domain/ports/services/email-service";

const DESC_MAX_CHARS = 200;

const PLACEHOLDER_AVATARS = [
  { bg: "linear-gradient(135deg,#ec4899,#f97316)", initials: "MR" },
  { bg: "linear-gradient(135deg,#8b5cf6,#06b6d4)", initials: "SL" },
  { bg: "linear-gradient(135deg,#10b981,#3b82f6)", initials: "AB" },
  { bg: "linear-gradient(135deg,#f59e0b,#ef4444)", initials: "CK" },
  { bg: "linear-gradient(135deg,#6366f1,#8b5cf6)", initials: "JD" },
];

const GRADIENTS = [
  { grad: "linear-gradient(135deg,#e8457a,#9333ea)", end: "#9333ea" },
  { grad: "linear-gradient(135deg,#3b82f6,#06b6d4)", end: "#06b6d4" },
  { grad: "linear-gradient(135deg,#f59e0b,#ef4444)", end: "#ef4444" },
  { grad: "linear-gradient(135deg,#10b981,#3b82f6)", end: "#3b82f6" },
  { grad: "linear-gradient(135deg,#8b5cf6,#ec4899)", end: "#ec4899" },
];

function circleGradient(name: string) {
  const base = name.replace(/^(communauté|community|cercle|circle)\s+/i, "").trim();
  return GRADIENTS[(base.charCodeAt(0) ?? 0) % GRADIENTS.length];
}

function truncate(desc: string): { text: string; truncated: boolean } {
  const s = desc.trim();
  if (s.length <= DESC_MAX_CHARS) return { text: s, truncated: false };
  return { text: s.slice(0, DESC_MAX_CHARS).replace(/\s+\S*$/, "") + "…", truncated: true };
}

function paragraphs(text: string) {
  return text.split(/\n\n|\n/).map((p) => p.trim()).filter(Boolean);
}

type Props = CircleInvitationEmailData & { baseUrl: string };

export function CircleInvitationEmail({
  inviterName,
  circleName,
  circleDescription,
  circleSlug,
  coverImageUrl,
  memberCount,
  momentCount,
  inviteUrl,
  strings,
  baseUrl,
}: Props) {
  const { grad, end: gradEnd } = circleGradient(circleName);
  const { text, truncated } = truncate(circleDescription);
  const paras = paragraphs(text);
  const circleUrl = circleSlug ? `${baseUrl}/circles/${circleSlug}` : inviteUrl;
  const initials = inviterName.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  const showSocial = (memberCount ?? 0) > 0;
  const avatarSlice = PLACEHOLDER_AVATARS.slice(0, Math.min(5, memberCount ?? 0));

  return (
    <Html>
      <Head />
      <Preview>{strings.subject}</Preview>
      <Body style={body}>
        <Container style={container}>
          <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={card}>
            <tbody>

              {/* ── 1. Topbar ── */}
              <tr>
                <td style={topbarTd}>
                  <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
                    <tbody><tr>
                      <td style={{ verticalAlign: "middle" }}>
                        <table cellPadding="0" cellSpacing="0" role="presentation"><tbody><tr>
                          <td style={{ width: "22px", height: "22px", verticalAlign: "middle" }}>
                            <Img src="https://the-playground.fr/icon-192.png" width="22" height="22" alt="The Playground" style={{ borderRadius: "6px", display: "block" }} />
                          </td>
                          <td style={{ paddingLeft: "8px", verticalAlign: "middle", fontSize: "13px", fontWeight: 700, color: "#1a1b2e", letterSpacing: "-0.01em" }}>
                            The Playground
                          </td>
                        </tr></tbody></table>
                      </td>
                      <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                        <span style={badgeStyle}>Invitation</span>
                      </td>
                    </tr></tbody>
                  </table>
                </td>
              </tr>

              {/* ── 2. Hero : bandeau dégradé ── */}
              <tr>
                <td style={{ height: "96px", backgroundImage: grad }} />
              </tr>

              {/* ── 3. Cover : split background (moitié grad / moitié blanc) ── */}
              {coverImageUrl && (
                <tr>
                  <td style={{ textAlign: "center", padding: "0", backgroundImage: `linear-gradient(to bottom, ${gradEnd} 44px, #ffffff 44px)` }}>
                    <Img
                      src={coverImageUrl}
                      width="88"
                      height="88"
                      alt={circleName}
                      style={{ borderRadius: "14px", border: "3px solid #ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", display: "block", margin: "0 auto" }}
                    />
                  </td>
                </tr>
              )}

              {/* ── 4. Content ── */}
              <tr>
                <td style={coverImageUrl ? contentTdWithCover : contentTd}>

                  {/* Inviter */}
                  <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ marginBottom: "14px" }}>
                    <tbody><tr><td style={{ textAlign: "center" }}>
                      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ display: "inline-table" }}>
                        <tbody><tr>
                          <td style={{ width: "30px", height: "30px", borderRadius: "50%", backgroundImage: grad, fontSize: "10px", fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: "30px", verticalAlign: "middle" }}>
                            {initials}
                          </td>
                          <td style={{ paddingLeft: "8px", verticalAlign: "middle", fontSize: "13px", color: "#6b7280" }}>
                            <span style={{ fontWeight: 700, color: "#7c3aed" }}>{inviterName}</span>
                            {" vous invite à rejoindre"}
                          </td>
                        </tr></tbody>
                      </table>
                    </td></tr></tbody>
                  </table>

                  {/* Circle name */}
                  <Text style={circleNameStyle}>{circleName}</Text>

                  {/* Description */}
                  <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ marginBottom: "16px" }}>
                    <tbody><tr>
                      <td style={{ backgroundColor: "#fafafa", border: "1px solid #f0f0f4", borderRadius: "10px", padding: "14px 16px" }}>
                        {paras.map((p, i) => (
                          <p key={i} style={{ fontSize: "13px", color: "#374151", lineHeight: "1.65", margin: "0 0 8px 0" }}>{p}</p>
                        ))}
                        {truncated && (
                          <Link href={circleUrl} style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", textDecoration: "none" }}>
                            Voir plus →
                          </Link>
                        )}
                      </td>
                    </tr></tbody>
                  </table>

                  {/* Stats : membres + événements */}
                  {showSocial && (
                    <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ marginBottom: "16px" }}>
                      <tbody><tr>
                        <td style={{ backgroundColor: "#f9f9fb", border: "1px solid #f0f0f2", borderRadius: "8px", padding: "10px 14px", textAlign: "center" }}>
                          <table cellPadding="0" cellSpacing="0" role="presentation" style={{ display: "inline-table" }}>
                            <tbody><tr>
                              <td style={{ fontSize: "13px", color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>
                                👥&nbsp;<strong>{memberCount}</strong>&nbsp;membre{(memberCount ?? 0) > 1 ? "s" : ""}
                              </td>
                              {(momentCount ?? 0) > 0 && (
                                <>
                                  <td style={{ padding: "0 10px", color: "#d1d5db", fontSize: "13px" }}>|</td>
                                  <td style={{ fontSize: "13px", color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>
                                    📅&nbsp;<strong>{momentCount}</strong>&nbsp;événement{(momentCount ?? 0) > 1 ? "s" : ""}
                                  </td>
                                </>
                              )}
                            </tr></tbody>
                          </table>
                        </td>
                      </tr></tbody>
                    </table>
                  )}

                  {/* Members avatars */}
                  {showSocial && avatarSlice.length > 0 && (
                    <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ marginBottom: "20px" }}>
                      <tbody><tr><td style={{ textAlign: "center" }}>
                        {avatarSlice.map((av, i) => (
                          <span key={i} style={{
                            display: "inline-block",
                            width: "26px", height: "26px",
                            borderRadius: "50%",
                            backgroundImage: av.bg,
                            border: "2px solid #fff",
                            fontSize: "9px", fontWeight: 700, color: "#fff",
                            textAlign: "center", lineHeight: "22px",
                            marginLeft: i === 0 ? "0" : "-7px",
                            verticalAlign: "middle",
                          }}>{av.initials}</span>
                        ))}
                        <span style={{ fontSize: "12px", color: "#6b7280", verticalAlign: "middle", marginLeft: "8px" }}>
                          Rejoignez&nbsp;<strong style={{ color: "#374151" }}>{memberCount}</strong>&nbsp;membres
                        </span>
                      </td></tr></tbody>
                    </table>
                  )}

                  {/* CTA */}
                  <Button style={ctaStyle} href={inviteUrl}>
                    {strings.ctaLabel}
                  </Button>

                  {/* Footer */}
                  <Hr style={{ borderColor: "#f0f0f4", margin: "20px 0 14px" }} />
                  <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
                    <tbody><tr>
                      <td style={{ verticalAlign: "middle" }}>
                        <Text style={{ fontSize: "11px", color: "#9ca3af", margin: "0", lineHeight: "1.5" }}>
                          Invitation envoyée par <strong>{inviterName}</strong> via The Playground
                        </Text>
                      </td>
                      <td style={{ textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap", paddingLeft: "12px" }}>
                        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ display: "inline-table" }}>
                          <tbody><tr>
                            <td style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundImage: "linear-gradient(135deg,#ec4899,#8b5cf6)", verticalAlign: "middle" }} />
                            <td style={{ paddingLeft: "5px", verticalAlign: "middle", fontSize: "10px", color: "#d1d5db", fontWeight: 500 }}>
                              the-playground.fr
                            </td>
                          </tr></tbody>
                        </table>
                      </td>
                    </tr></tbody>
                  </table>

                </td>
              </tr>
            </tbody>
          </table>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  margin: "0", padding: "0",
};
const container: React.CSSProperties = { maxWidth: "520px", margin: "0 auto", padding: "32px 16px 40px" };
const card: React.CSSProperties = { backgroundColor: "#ffffff", borderRadius: "16px", overflow: "hidden" };
const topbarTd: React.CSSProperties = { padding: "16px 28px", borderBottom: "1px solid #f0f0f4" };
const badgeStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "#ec4899", backgroundColor: "#fde8f0", padding: "3px 10px", borderRadius: "20px" };
const contentTd: React.CSSProperties = { padding: "24px 28px 28px" };
const contentTdWithCover: React.CSSProperties = { padding: "20px 28px 28px" };
const circleNameStyle: React.CSSProperties = { fontSize: "22px", fontWeight: 800, color: "#0f0f1a", letterSpacing: "-0.03em", lineHeight: "1.2", margin: "0 0 18px 0", textAlign: "center" };
const ctaStyle: React.CSSProperties = { backgroundImage: "linear-gradient(135deg,#ec4899,#8b5cf6)", color: "#ffffff", fontSize: "15px", fontWeight: 700, borderRadius: "10px", padding: "13px 32px", textDecoration: "none", display: "block", width: "100%", textAlign: "center", boxSizing: "border-box" };
