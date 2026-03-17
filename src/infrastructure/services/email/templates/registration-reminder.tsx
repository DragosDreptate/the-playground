import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { RegistrationReminderEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  title,
  metaSection,
  metaRow,
  metaLabel,
  metaValue,
} from "./components/email-styles";

type Props = RegistrationReminderEmailData & {
  baseUrl: string;
};

export function RegistrationReminderEmail({
  momentTitle,
  momentSlug,
  momentDate,
  momentDateMonth,
  momentDateDay,
  locationText,
  baseUrl,
  strings,
}: Props) {
  const momentUrl = `${baseUrl}/m/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>

      <Section style={metaSection}>
        <Text style={metaRow}>
          <span style={metaLabel}>{strings.dateLabel}</span>
          <br />
          <span style={metaValue}>{momentDate}</span>
        </Text>
        <Text style={metaRow}>
          <span style={metaLabel}>{strings.locationLabel}</span>
          <br />
          <span style={metaValue}>{locationText}</span>
        </Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={momentUrl}>
          {strings.viewMomentCta}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 24px 0",
  lineHeight: "24px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

