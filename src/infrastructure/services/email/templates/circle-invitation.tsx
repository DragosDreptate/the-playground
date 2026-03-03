import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { CircleInvitationEmailData } from "@/domain/ports/services/email-service";

type Props = CircleInvitationEmailData & {
  baseUrl: string;
};

export function CircleInvitationEmail({
  inviterName,
  circleName,
  circleDescription,
  inviteUrl,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={circleSection}>
        <Text style={circleName_}>{circleName}</Text>
        {circleDescription && (
          <Text style={circleDesc}>{circleDescription}</Text>
        )}
        <Text style={inviterLabel}>Invité par {inviterName}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={inviteUrl}>
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

const circleSection: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const circleName_: React.CSSProperties = {
  fontSize: "16px",
  color: "#18181b",
  fontWeight: 600,
  margin: "0 0 8px 0",
};

const circleDesc: React.CSSProperties = {
  fontSize: "13px",
  color: "#52525b",
  margin: "0 0 8px 0",
  lineHeight: "20px",
};

const inviterLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#a855f7",
  fontWeight: 500,
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

const ctaButton: React.CSSProperties = {
  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 32px",
  textDecoration: "none",
  display: "inline-block",
};
