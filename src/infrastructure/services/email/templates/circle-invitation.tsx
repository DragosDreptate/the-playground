import { Button, Link, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { CircleInvitationEmailData } from "@/domain/ports/services/email-service";
import { getMomentGradient } from "@/lib/gradient";

const DESC_MAX_CHARS = 200;

const PLACEHOLDER_AVATAR_COLORS = [
  "linear-gradient(135deg,#ec4899,#f97316)",
  "linear-gradient(135deg,#8b5cf6,#06b6d4)",
  "linear-gradient(135deg,#10b981,#3b82f6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
];

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
  const grad = getMomentGradient(circleName);
  const { text, truncated } = truncate(circleDescription);
  const paras = paragraphs(text);
  const circleUrl = circleSlug ? `${baseUrl}/circles/${circleSlug}` : inviteUrl;
  const initials = inviterName.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  const showSocial = (memberCount ?? 0) > 0;
  const avatarCount = Math.min(5, memberCount ?? 0);

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>

      {/* Badge */}
      <Section style={badgeSection}>
        <span style={badgeStyle}>Invitation</span>
      </Section>

      {/* Cover : image réelle ou carré dégradé */}
      <Section style={coverSection}>
        {coverImageUrl ? (
          <Img
            src={coverImageUrl}
            width="80"
            height="80"
            alt={circleName}
            style={coverImg}
          />
        ) : (
          <table cellPadding="0" cellSpacing="0" role="presentation" style={{ display: "inline-table" }}>
            <tbody><tr>
              <td style={{ width: "80px", height: "80px", borderRadius: "14px", background: grad, border: "3px solid #f0f0f4" }} />
            </tr></tbody>
          </table>
        )}
      </Section>

      {/* Inviter */}
      <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ marginBottom: "14px" }}>
        <tbody><tr><td style={{ textAlign: "center" }}>
          <table cellPadding="0" cellSpacing="0" role="presentation" style={{ display: "inline-table" }}>
            <tbody><tr>
              <td style={inviterAvatar(grad)}>{initials}</td>
              <td style={inviterText}>
                <span style={inviterName_}>{inviterName}</span>
                {" vous invite à rejoindre"}
              </td>
            </tr></tbody>
          </table>
        </td></tr></tbody>
      </table>

      {/* Circle name */}
      <Text style={circleNameStyle}>{circleName}</Text>

      {/* Description */}
      <Section style={descBox}>
        {paras.map((p, i) => (
          <p key={i} style={descPara}>{p}</p>
        ))}
        {truncated && (
          <Link href={circleUrl} style={descLink}>
            Voir plus →
          </Link>
        )}
      </Section>

      {/* Stats : membres + événements */}
      {showSocial && (
        <Section style={statsBox}>
          <table cellPadding="0" cellSpacing="0" role="presentation" style={{ display: "inline-table" }}>
            <tbody><tr>
              <td style={statCell}>
                👥&nbsp;<strong>{memberCount}</strong>&nbsp;membre{(memberCount ?? 0) > 1 ? "s" : ""}
              </td>
              {(momentCount ?? 0) > 0 && (
                <>
                  <td style={statDivider}>|</td>
                  <td style={statCell}>
                    📅&nbsp;<strong>{momentCount}</strong>&nbsp;événement{(momentCount ?? 0) > 1 ? "s" : ""}
                  </td>
                </>
              )}
            </tr></tbody>
          </table>
        </Section>
      )}

      {/* Member avatars */}
      {showSocial && avatarCount > 0 && (
        <Section style={avatarSection}>
          {PLACEHOLDER_AVATAR_COLORS.slice(0, avatarCount).map((bg, i) => (
            <span key={i} style={avatarDot(bg, i)} />
          ))}
          <span style={avatarLabel}>
            Rejoignez&nbsp;<strong style={{ color: "#374151" }}>{memberCount}</strong>&nbsp;membres
          </span>
        </Section>
      )}

      {/* CTA */}
      <Section style={ctaSection}>
        <Button style={ctaButton} href={inviteUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>

    </EmailLayout>
  );
}

// ── Styles ──────────────────────────────────────────────

const badgeSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const badgeStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#ec4899",
  backgroundColor: "#fde8f0",
  padding: "3px 10px",
  borderRadius: "20px",
};

const coverSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const coverImg: React.CSSProperties = {
  borderRadius: "14px",
  border: "3px solid #f0f0f4",
  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
  display: "inline-block",
};

function inviterAvatar(bg: string): React.CSSProperties {
  return {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: bg,
    fontSize: "10px",
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
    lineHeight: "28px",
    verticalAlign: "middle",
  };
}

const inviterText: React.CSSProperties = {
  paddingLeft: "8px",
  verticalAlign: "middle",
  fontSize: "13px",
  color: "#6b7280",
};

const inviterName_: React.CSSProperties = {
  fontWeight: 700,
  color: "#7c3aed",
};

const circleNameStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  letterSpacing: "-0.02em",
  lineHeight: "1.3",
  margin: "0 0 16px 0",
  textAlign: "center" as const,
};

const descBox: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "16px",
};

const descPara: React.CSSProperties = {
  fontSize: "13px",
  color: "#52525b",
  lineHeight: "1.65",
  margin: "0 0 8px 0",
};

const descLink: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#7c3aed",
  textDecoration: "none",
};

const statsBox: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "10px 14px",
  marginBottom: "16px",
  textAlign: "center" as const,
};

const statCell: React.CSSProperties = {
  fontSize: "13px",
  color: "#374151",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const statDivider: React.CSSProperties = {
  padding: "0 10px",
  color: "#d1d5db",
  fontSize: "13px",
};

const avatarSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

function avatarDot(bg: string, index: number): React.CSSProperties {
  return {
    display: "inline-block",
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: bg,
    border: "2px solid #fff",
    marginLeft: index === 0 ? "0" : "-7px",
    verticalAlign: "middle",
  };
}

const avatarLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  verticalAlign: "middle",
  marginLeft: "8px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#ec4899",
  backgroundImage: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 32px",
  textDecoration: "none",
  display: "block",
  textAlign: "center" as const,
};
