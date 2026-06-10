import { Button, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { MomentHostMessageEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  title,
  metaSection,
  metaRow,
  metaLabel,
  metaValue,
} from "./components/email-styles";

type Props = MomentHostMessageEmailData & {
  /** Salutation résolue par destinataire dans l'adapter (template déclaratif). */
  greeting: string;
};

export function MomentHostMessageEmail({
  greeting,
  hostName,
  hostAvatarUrl,
  bodyHtml,
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

  return (
    <EmailLayout preview={strings.preheader} footer={strings.footer}>
      <Section style={hostRow}>
        {hostAvatarUrl && (
          <Img src={hostAvatarUrl} alt="" width={36} height={36} style={hostAvatar} />
        )}
        <Text style={hostNameText}>{hostName}</Text>
      </Section>

      <Text style={greetingText}>{greeting}</Text>

      <Section style={messageBlock}>
        {/* HTML passé par l'allowlist stricte côté serveur avant injection */}
        <div style={messageBody} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </Section>

      <Section style={momentCard}>
        <CalendarBadge month={momentDateMonth} day={momentDateDay} />
        <Text style={title}>{momentTitle}</Text>
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
      </Section>
    </EmailLayout>
  );
}

const hostRow: React.CSSProperties = {
  marginBottom: "16px",
};

const hostAvatar: React.CSSProperties = {
  borderRadius: "50%",
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "10px",
};

const hostNameText: React.CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
  fontSize: "14px",
  fontWeight: 600,
  color: "#18181b",
  margin: 0,
};

const greetingText: React.CSSProperties = {
  fontSize: "14px",
  color: "#3f3f46",
  margin: "0 0 12px 0",
  lineHeight: "22px",
};

const messageBlock: React.CSSProperties = {
  marginBottom: "24px",
};

const messageBody: React.CSSProperties = {
  fontSize: "14px",
  color: "#3f3f46",
  lineHeight: "22px",
};

const momentCard: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  paddingTop: "20px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "8px",
};
