import { Button, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { BroadcastMomentEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  title,
  headingSm as heading,
  metaSection,
  metaRow,
  metaLabel,
  metaValue,
  unsubscribeRow,
  unsubscribeLink,
} from "./components/email-styles";

type Props = BroadcastMomentEmailData;

export function BroadcastMomentEmail({
  momentTitle,
  momentSlug,
  momentDate,
  momentDateMonth,
  momentDateDay,
  momentLocation,
  appUrl,
  strings,
}: Props) {
  const momentUrl = `${appUrl}/m/${momentSlug}`;
  const dashboardUrl = `${appUrl}/dashboard/profile`;

  return (
    <EmailLayout preview={strings.preheader} footer={strings.unsubscribeText}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={intro}>{strings.intro}</Text>

      {strings.customMessage && (
        <Section style={customMessageBlock}>
          <Text style={customMessageText}>{strings.customMessage}</Text>
        </Section>
      )}

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
        <Link href={dashboardUrl} style={unsubscribeLink}>
          {strings.unsubscribeLabel}
        </Link>
      </Text>
    </EmailLayout>
  );
}

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const customMessageBlock: React.CSSProperties = {
  borderLeft: "3px solid #ec4899",
  backgroundColor: "#fdf2f8",
  borderRadius: "0 8px 8px 0",
  padding: "12px 16px",
  marginBottom: "20px",
};

const customMessageText: React.CSSProperties = {
  fontSize: "14px",
  color: "#3f3f46",
  margin: "0",
  lineHeight: "22px",
  fontStyle: "italic",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

