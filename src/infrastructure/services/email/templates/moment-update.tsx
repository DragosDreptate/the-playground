import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { MomentUpdateEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  title,
  headingSm as heading,
  metaSection,
  metaRow,
  metaLabel,
  metaValue,
} from "./components/email-styles";

type Props = MomentUpdateEmailData & {
  baseUrl: string;
};

export function MomentUpdateEmail({
  momentTitle,
  momentSlug,
  momentDate,
  momentDateMonth,
  momentDateDay,
  locationText,
  dateChanged,
  locationChanged,
  baseUrl,
  strings,
}: Props) {
  const momentUrl = `${baseUrl}/m/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={intro}>{strings.intro}</Text>

      {(dateChanged || locationChanged) && (
        <Section style={changesSection}>
          {dateChanged && (
            <Text style={changeTag}>{strings.dateChangedLabel}</Text>
          )}
          {locationChanged && (
            <Text style={changeTag}>{strings.locationChangedLabel}</Text>
          )}
        </Section>
      )}

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

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 16px 0",
  lineHeight: "22px",
};

const changesSection: React.CSSProperties = {
  marginBottom: "20px",
  display: "flex",
  gap: "8px",
};

const changeTag: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#7c3aed",
  background: "#f5f3ff",
  border: "1px solid #ddd6fe",
  borderRadius: "6px",
  padding: "4px 10px",
  margin: "0 6px 0 0",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

