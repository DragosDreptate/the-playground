import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { AdminCommentPendingEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  infoCard,
  infoLabel,
  infoValue,
} from "./components/email-styles";

type Props = AdminCommentPendingEmailData & {
  baseUrl: string;
};

export function AdminCommentPendingEmail({
  playerName,
  momentTitle,
  commentPreview,
  adminUrl,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={infoCard}>
        <Text style={infoLabel}>Auteur</Text>
        <Text style={infoValue}>{playerName}</Text>
        <Text style={infoLabel}>Événement</Text>
        <Text style={infoValue}>{momentTitle}</Text>
        <Text style={infoLabel}>{strings.commentLabel}</Text>
        <Text style={infoValue}>{commentPreview}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={adminUrl}>
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
