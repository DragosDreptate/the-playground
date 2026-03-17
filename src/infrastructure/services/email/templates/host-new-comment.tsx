import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { NewCommentEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  commentSection,
  commentLabel,
  commentText,
} from "./components/email-styles";

type Props = NewCommentEmailData & {
  baseUrl: string;
};

export function HostNewCommentEmail({
  momentSlug,
  commentPreview,
  baseUrl,
  strings,
}: Props) {
  const viewUrl = `${baseUrl}/m/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={commentSection}>
        <Text style={commentLabel}>{strings.commentPreviewLabel}</Text>
        <Text style={commentText}>&ldquo;{commentPreview}&rdquo;</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={viewUrl}>
          {strings.viewCommentCta}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

