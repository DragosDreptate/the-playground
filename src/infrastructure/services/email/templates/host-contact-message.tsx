import { Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CenteredLogo } from "./components/centered-logo";
import type { HostContactMessageEmailData } from "@/domain/ports/services/email-service";
import {
  headingLg as heading,
  commentSection,
  commentLabel,
  commentText,
} from "./components/email-styles";

type Props = HostContactMessageEmailData;

export function HostContactMessageEmail({
  message,
  aboutLine,
  appUrl,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Section style={logoSection}>
        <CenteredLogo src={`${appUrl}/brand/logo-light.png`} />
      </Section>

      <Text style={heading}>{strings.heading}</Text>

      <Text style={contextLabel}>{aboutLine}</Text>

      <Text style={intro}>{strings.intro}</Text>

      <Section style={commentSection}>
        <Text style={commentLabel}>{strings.messageLabel}</Text>
        <Text style={commentText}>{message}</Text>
      </Section>

      <Text style={replyHint}>{strings.replyHint}</Text>
    </EmailLayout>
  );
}

const logoSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const contextLabel: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 16px 0",
  lineHeight: "20px",
};

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const replyHint: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "20px 0 0 0",
  lineHeight: "20px",
};
