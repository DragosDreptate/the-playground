import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { HostPaidCancellationEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
} from "./components/email-styles";

type Props = HostPaidCancellationEmailData & {
  baseUrl: string;
};

export function HostPaidCancellationEmail({
  momentSlug,
  circleSlug,
  baseUrl,
  strings,
}: Props) {
  const manageUrl = `${baseUrl}/dashboard/circles/${circleSlug}/moments/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      {strings.refundMessage && (
        <Section style={refundSection}>
          <Text style={refundText}>{strings.refundMessage}</Text>
        </Section>
      )}

      <Section style={ctaSection}>
        <Button style={ctaButton} href={manageUrl}>
          {strings.manageRegistrationsCta}
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

const refundSection: React.CSSProperties = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const refundText: React.CSSProperties = {
  fontSize: "13px",
  color: "#92400e",
  margin: "0",
  lineHeight: "20px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};
