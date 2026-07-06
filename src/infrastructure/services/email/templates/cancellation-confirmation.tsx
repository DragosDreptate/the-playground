import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { CancellationConfirmationEmailData } from "@/domain/ports/services/email-service";
import { ctaButton, title, headingSm as heading } from "./components/email-styles";

type Props = CancellationConfirmationEmailData & {
  baseUrl: string;
};

export function CancellationConfirmationEmail({
  momentTitle,
  momentSlug,
  momentDateMonth,
  momentDateDay,
  baseUrl,
  strings,
}: Props) {
  const momentUrl = `${baseUrl}/m/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={message}>{strings.message}</Text>

      {strings.refundMessage && (
        <Section style={refundSection}>
          <Text style={refundText}>{strings.refundMessage}</Text>
        </Section>
      )}

      <Section style={ctaSection}>
        <Button style={ctaButton} href={momentUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
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
  marginBottom: "16px",
};
