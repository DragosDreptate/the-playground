import { Button, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { NewMomentMemberEmailData } from "@/domain/ports/services/email-service";

type Props = NewMomentMemberEmailData & {
  baseUrl: string;
};

export function NewMomentNotificationEmail({
  circleName,
  circleSlug,
  momentTitle,
  momentSlug,
  momentDate,
  momentDateMonth,
  momentDateDay,
  momentLocation,
  baseUrl,
  strings,
}: Props) {
  const momentUrl = `${baseUrl}/m/${momentSlug}`;
  const circleUrl = `${baseUrl}/circles/${circleSlug}`;

  return (
    <EmailLayout preview={strings.preheader} footer={strings.unsubscribeText}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={intro}>{strings.intro}</Text>

      <Section style={metaSection}>
        <Text style={metaRow}>
          <span style={metaLabel}>{strings.dateLabel}</span>
          <br />
          <span style={metaValue}>{momentDate}</span>
        </Text>
        {momentLocation && (
          <Text style={metaRow}>
            <span style={metaLabel}>{strings.locationLabel}</span>
            <br />
            <span style={metaValue}>{momentLocation}</span>
          </Text>
        )}
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={momentUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>

      <Text style={unsubscribeRow}>
        <Link href={circleUrl} style={unsubscribeLink}>
          {strings.unsubscribeLabel}
        </Link>
      </Text>
    </EmailLayout>
  );
}

const title: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  lineHeight: "28px",
};

const heading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 8px 0",
  lineHeight: "24px",
};

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const metaSection: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  paddingTop: "16px",
  marginBottom: "24px",
};

const metaRow: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  margin: "0 0 12px 0",
  lineHeight: "20px",
};

const metaLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const metaValue: React.CSSProperties = {
  color: "#18181b",
  fontSize: "14px",
  fontWeight: 500,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#ec4899", backgroundImage: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 32px",
  textDecoration: "none",
  display: "inline-block",
};

const unsubscribeRow: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0",
};

const unsubscribeLink: React.CSSProperties = {
  color: "#a1a1aa",
  textDecoration: "underline",
};
