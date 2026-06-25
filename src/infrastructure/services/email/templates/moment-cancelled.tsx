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
  hostMessage,
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

      {hostMessage && (
        <Section style={hostMessageSection}>
          <Text style={hostMessageLabel}>{strings.hostMessageLabel}</Text>
          <Text style={hostMessageText}>{hostMessage}</Text>
        </Section>
      )}

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

const hostMessageSection: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const hostMessageLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "#71717a",
  margin: "0 0 6px 0",
};

const hostMessageText: React.CSSProperties = {
  fontSize: "14px",
  color: "#3f3f46",
  margin: "0",
  lineHeight: "22px",
  whiteSpace: "pre-wrap" as const,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

