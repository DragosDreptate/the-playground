import { Button, Hr, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

export type MagicLinkEmailStrings = {
  preview: string;
  heading: string;
  bodyText: string;
  ctaLabel: string;
  expiryText: string;
  securityText: string;
  footer: string;
};

type Props = {
  url: string;
  baseUrl: string;
  strings: MagicLinkEmailStrings;
};

export function MagicLinkEmail({ url, baseUrl, strings }: Props) {
  return (
    <EmailLayout preview={strings.preview} footer={strings.footer}>
      <Section style={iconSection}>
        {/* Logo The Playground — PNG hébergé sur public/brand/icon.png.
            URL absolue obligatoire pour les clients email. */}
        <Img
          src={`${baseUrl}/brand/icon.png`}
          width="48"
          height="48"
          alt="The Playground"
          style={iconImage}
        />
        <Text style={brandName}>The Playground</Text>
      </Section>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={bodyText}>{strings.bodyText}</Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={url}>
          {strings.ctaLabel}
        </Button>
      </Section>

      <Text style={expiryText}>{strings.expiryText}</Text>

      <Hr style={separator} />

      <Text style={securityText}>{strings.securityText}</Text>
    </EmailLayout>
  );
}

const iconSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

// Logo 48×48 — PNG pour compatibilité maximale (Gmail, Outlook, Apple Mail
// n'ont qu'un support SVG partiel). Centré via margin auto.
const iconImage: React.CSSProperties = {
  margin: "0 auto 8px auto",
  display: "block",
};

const brandName: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#18181b",
  letterSpacing: "0.3px",
  textTransform: "uppercase" as const,
  margin: 0,
  textAlign: "center" as const,
};

const heading: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  textAlign: "center" as const,
  margin: "0 0 12px 0",
  lineHeight: "28px",
};

const bodyText: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  textAlign: "center" as const,
  margin: "0 0 28px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#ec4899", backgroundImage: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 40px",
  textDecoration: "none",
  display: "inline-block",
};

const expiryText: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const separator: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "0 0 16px 0",
};

const securityText: React.CSSProperties = {
  fontSize: "12px",
  color: "#71717a",
  textAlign: "center" as const,
  margin: 0,
  lineHeight: "20px",
};
