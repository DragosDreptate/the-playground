import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { AdminEntityCreatedEmailData } from "@/domain/ports/services/email-service";

type Props = AdminEntityCreatedEmailData & {
  baseUrl: string;
};

export function AdminEntityCreatedEmail({
  entityType,
  entityName,
  creatorName,
  creatorEmail,
  circleName,
  entityUrl,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={infoCard}>
        <Text style={infoLabel}>
          {entityType === "circle" ? "Communauté" : "Événement"}
        </Text>
        <Text style={infoValue}>{entityName}</Text>
        {circleName && (
          <>
            <Text style={infoLabel}>Communauté</Text>
            <Text style={infoValue}>{circleName}</Text>
          </>
        )}
        <Text style={infoLabel}>Créé par</Text>
        <Text style={infoValue}>
          {creatorName} — {creatorEmail}
        </Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={entityUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 16px 0",
  lineHeight: "24px",
};

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const infoCard: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const infoLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "8px 0 2px 0",
};

const infoValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  fontWeight: 500,
  margin: "0 0 4px 0",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#ec4899", backgroundImage: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 32px",
  textDecoration: "none",
  display: "inline-block",
};
