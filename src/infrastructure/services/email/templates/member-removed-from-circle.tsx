import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { MemberRemovedFromCircleEmailData } from "@/domain/ports/services/email-service";
import { ctaButton, title, headingSm as heading } from "./components/email-styles";

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

