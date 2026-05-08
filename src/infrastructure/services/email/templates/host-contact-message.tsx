import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { HostContactMessageEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  commentSection,
  commentLabel,
  commentText,
} from "./components/email-styles";

type Props = HostContactMessageEmailData;

export function HostContactMessageEmail({
  senderName,
  senderEmail,
  message,
  contextUrl,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={intro}>
        {strings.intro.replace("{senderName}", senderName)}
      </Text>

      <Section style={commentSection}>
        <Text style={commentLabel}>{strings.messageLabel}</Text>
        <Text style={commentText}>{message}</Text>
      </Section>

      <Text style={replyHint}>
        {strings.replyHint
          .replace("{senderName}", senderName)
          .replace("{senderEmail}", senderEmail)}
      </Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={contextUrl}>
          {strings.viewContextCta}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const replyHint: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "20px 0",
  lineHeight: "20px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginTop: "8px",
};
