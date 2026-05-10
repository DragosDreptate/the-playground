import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { AdminMomentUpdatedEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  infoCard,
  infoLabel,
  infoValue,
} from "./components/email-styles";

type Props = AdminMomentUpdatedEmailData & {
  baseUrl: string;
};

export function AdminMomentUpdatedEmail({
  momentTitle,
  circleName,
  hostName,
  hostEmail,
  momentUrl,
  momentDate,
  locationText,
  changedFields,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={infoCard}>
        <Text style={infoLabel}>Événement</Text>
        <Text style={infoValue}>{momentTitle}</Text>
        <Text style={infoLabel}>Communauté</Text>
        <Text style={infoValue}>{circleName}</Text>
        <Text style={infoLabel}>{strings.dateLabel}</Text>
        <Text style={infoValue}>{momentDate}</Text>
        <Text style={infoLabel}>{strings.locationLabel}</Text>
        <Text style={infoValue}>{locationText}</Text>
        <Text style={infoLabel}>Modifié par</Text>
        <Text style={infoValue}>
          {hostName} — {hostEmail}
        </Text>
        <Text style={infoLabel}>{strings.changesLabel}</Text>
        <Text style={infoValue}>{changedFields.join(", ")}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={momentUrl}>
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
