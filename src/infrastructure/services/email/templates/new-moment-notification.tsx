import { Button, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { NewMomentMemberEmailData } from "@/domain/ports/services/email-service";
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

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

