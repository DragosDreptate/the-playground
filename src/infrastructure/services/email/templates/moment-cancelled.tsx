import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { MomentCancelledEmailData } from "@/domain/ports/services/email-service";
import { ctaButton, headingSm as heading } from "./components/email-styles";

type Props = MomentCancelledEmailData & {
  baseUrl: string;
};

export function MomentCancelledEmail({
  momentTitle,
  momentDateMonth,
  momentDateDay,
  circleName,
  circleSlug,
  refundMessage,
  baseUrl,
  strings,
}: Props) {
  const circleUrl = `${baseUrl}/c/${circleSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={message}>{strings.message}</Text>

      {refundMessage && (
        <Section style={refundSection}>
          <Text style={refundText}>{refundMessage}</Text>
        </Section>
      )}

      <Section style={ctaSection}>
        <Button style={ctaButton} href={circleUrl}>
          {strings.ctaLabel} — {circleName}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const title: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#71717a",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  lineHeight: "28px",
  textDecoration: "line-through",
};

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const refundSection: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const refundText: React.CSSProperties = {
  fontSize: "13px",
  color: "#166534",
  margin: "0",
  lineHeight: "20px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

