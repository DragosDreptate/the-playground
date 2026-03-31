import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../email/templates/components/email-layout";
import {
  ctaButton,
  headingLg as heading,
  infoCard,
  infoLabel,
  infoValue,
} from "../email/templates/components/email-styles";

type Props = {
  issueShortId: string;
  issueTitle: string;
  culprit: string;
  urgency: string;
  urgencyLabel: string;
  impact: string;
  diagnosis: string;
  remediation: string;
  sentryUrl: string;
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#2563eb",
  noise: "#71717a",
};

export function SentryIssueAnalysisEmail({
  issueShortId,
  issueTitle,
  culprit,
  urgency,
  urgencyLabel,
  impact,
  diagnosis,
  remediation,
  sentryUrl,
}: Props) {
  const color = URGENCY_COLORS[urgency] ?? "#71717a";

  return (
    <EmailLayout
      preview={`[${urgencyLabel}] ${issueShortId} — ${issueTitle.slice(0, 60)}`}
      footer="Sentry Issue Analysis — The Playground"
    >
      {/* Urgency badge */}
      <Text style={{ ...urgencyBadge, backgroundColor: color }}>
        {urgencyLabel}
      </Text>

      <Text style={heading}>{issueShortId}</Text>
      <Text style={titleStyle}>{issueTitle}</Text>

      <Section style={infoCard}>
        <Text style={infoLabel}>Culprit</Text>
        <Text style={infoValue}>{culprit}</Text>

        <Text style={infoLabel}>Impact</Text>
        <Text style={infoValue}>{impact}</Text>
      </Section>

      <Section style={infoCard}>
        <Text style={infoLabel}>Diagnostic</Text>
        <Text style={bodyText}>{diagnosis}</Text>
      </Section>

      <Section style={infoCard}>
        <Text style={infoLabel}>Remédiation</Text>
        <Text style={bodyText}>{remediation}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={sentryUrl}>
          Voir dans Sentry
        </Button>
      </Section>
    </EmailLayout>
  );
}

const urgencyBadge: React.CSSProperties = {
  display: "inline-block",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderRadius: "4px",
  padding: "4px 10px",
  margin: "0 0 12px 0",
};

const titleStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "20px",
  wordBreak: "break-word",
};

const bodyText: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  margin: "0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};
