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
import { URGENCY_META, USER_IMPACT_META, type AnalysisResult } from "./analysis-meta";
import type { IssueInput } from "./analyze-issue";

type Props = {
  issue: Pick<IssueInput, "issueShortId" | "issueTitle">;
  analysis: AnalysisResult;
  sentryUrl: string;
};

type InfoRowProps = {
  label: string;
  body: string;
  accentColor?: string;
  labelBold?: boolean;
};

function InfoRow({ label, body, accentColor, labelBold }: InfoRowProps) {
  const sectionStyle = accentColor
    ? { ...infoCard, borderLeft: `4px solid ${accentColor}` }
    : infoCard;
  const finalLabelStyle = accentColor
    ? { ...infoLabel, color: accentColor, fontWeight: labelBold ? 700 : infoLabel.fontWeight }
    : infoLabel;
  return (
    <Section style={sectionStyle}>
      <Text style={finalLabelStyle}>{label}</Text>
      <Text style={bodyText}>{body}</Text>
    </Section>
  );
}

export function SentryIssueAnalysisEmail({ issue, analysis, sentryUrl }: Props) {
  const urgencyMeta = URGENCY_META[analysis.urgency];
  const impactMeta = USER_IMPACT_META[analysis.userImpact.level];

  return (
    <EmailLayout
      preview={`[${urgencyMeta.label}] ${issue.issueShortId} — ${issue.issueTitle.slice(0, 60)}`}
      footer="Sentry Issue Analysis — The Playground"
    >
      <Text style={{ ...urgencyBadge, backgroundColor: urgencyMeta.color }}>
        {urgencyMeta.label}
      </Text>

      <Text style={heading}>{issue.issueShortId}</Text>
      <Text style={titleStyle}>{issue.issueTitle}</Text>

      <InfoRow label="Déclencheur" body={analysis.trigger} />
      <InfoRow label="Conséquence fonctionnelle" body={analysis.functionalConsequence} />
      <InfoRow
        label={impactMeta.label}
        body={analysis.userImpact.description}
        accentColor={impactMeta.color}
        labelBold
      />

      <Section style={technicalCard}>
        <Text style={technicalLabel}>Détails techniques</Text>
        <Text style={technicalBody}>{analysis.technical}</Text>
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

const technicalCard: React.CSSProperties = {
  ...infoCard,
  backgroundColor: "#fafafa",
  borderLeft: "3px solid #d4d4d8",
};

const technicalLabel: React.CSSProperties = {
  ...infoLabel,
  color: "#a1a1aa",
};

const technicalBody: React.CSSProperties = {
  ...infoValue,
  fontSize: "13px",
  color: "#71717a",
  lineHeight: "20px",
  fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};
