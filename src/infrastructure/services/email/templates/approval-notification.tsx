import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { ctaButton, headingSm as heading } from "./components/email-styles";

type Props = {
  recipientName: string;
  heading: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
};

export function ApprovalNotificationEmail({
  heading: headingText,
  message: messageText,
  ctaLabel,
  ctaUrl,
  footer,
}: Props) {
  return (
    <EmailLayout preview={headingText} footer={footer}>
      <Text style={heading}>{headingText}</Text>
      <Text style={messageStyle}>{messageText}</Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={ctaUrl}>
          {ctaLabel}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const messageStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};
