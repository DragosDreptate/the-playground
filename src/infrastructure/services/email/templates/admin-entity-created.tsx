import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { AdminEntityCreatedEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  infoCard,
  infoLabel,
  infoValue,
} from "./components/email-styles";

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

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

