import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { HostNewRegistrationEmailData } from "@/domain/ports/services/email-service";

type Props = HostNewRegistrationEmailData & {
  baseUrl: string;
};

export function HostNewRegistrationEmail({
  momentSlug,
  circleSlug,
  registrationInfo,
  baseUrl,
  strings,
}: Props) {
  const manageUrl = `${baseUrl}/dashboard/circles/${circleSlug}/moments/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={statsSection}>
        <Text style={statsText}>{registrationInfo}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={manageUrl}>
          {strings.manageRegistrationsCta}
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

const statsSection: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const statsText: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  fontWeight: 500,
  margin: "0",
  textAlign: "center" as const,
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
