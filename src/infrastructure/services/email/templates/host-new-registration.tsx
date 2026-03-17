import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { HostNewRegistrationEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  statsSection,
  statsText,
} from "./components/email-styles";

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

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

