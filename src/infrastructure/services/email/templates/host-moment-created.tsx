import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { HostMomentCreatedEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  title,
  headingSm as heading,
  metaSection,
  metaRow,
  metaLabel,
  metaValue,
} from "./components/email-styles";

type Props = HostMomentCreatedEmailData & {
  baseUrl: string;
};

export function HostMomentCreatedEmail({
  hostName,
  momentTitle,
  momentSlug,
  circleSlug,
  momentDate,
  momentDateMonth,
  momentDateDay,
  locationText,
  baseUrl,
  strings,
}: Props) {
  const manageMomentUrl = `${baseUrl}/dashboard/circles/${circleSlug}/moments/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={statusMessage}>{strings.statusMessage}</Text>

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
        <Button style={ctaButton} href={manageMomentUrl}>
          {strings.manageMomentCta}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const statusMessage: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

