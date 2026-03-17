import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { MemberRemovedFromCircleEmailData } from "@/domain/ports/services/email-service";

type Props = MemberRemovedFromCircleEmailData & {
  baseUrl: string;
};

export function MemberRemovedFromCircleEmail({
  circleName,
  baseUrl,
  strings,
}: Props) {
  const explorerUrl = `${baseUrl}/explorer`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={title}>{circleName}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={message}>{strings.message}</Text>

      {strings.cancelledRegistrationsMessage && (
        <Text style={subMessage}>{strings.cancelledRegistrationsMessage}</Text>
      )}

      <Section style={ctaSection}>
        <Button style={ctaButton} href={explorerUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const title: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  lineHeight: "28px",
};

const heading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 8px 0",
  lineHeight: "24px",
};

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 8px 0",
  lineHeight: "22px",
};

const subMessage: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
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
  display: "inline-block",
};
