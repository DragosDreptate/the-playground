import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { HostRefundFailedEmailData } from "@/domain/ports/services/email-service";
import { ctaButton, headingLg as heading } from "./components/email-styles";

type Props = HostRefundFailedEmailData & {
  baseUrl: string;
};

export function HostRefundFailedEmail({ circleSlug, baseUrl, strings }: Props) {
  const settingsUrl = `${baseUrl}/dashboard/circles/${circleSlug}/edit`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>
      <Text style={message}>{strings.participants}</Text>
      <Text style={message}>{strings.action}</Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={settingsUrl}>
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
