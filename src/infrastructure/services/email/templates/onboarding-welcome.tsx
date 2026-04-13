import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

import { onboardingWelcomeContent as content } from "@/content/emails/onboarding-welcome.content";

type Props = {
  firstName: string | null;
  /** Défaut prod pour le backfill one-shot ; la resend-email-service injecte `getBaseUrl()`. */
  baseUrl?: string;
};

/**
 * Lettre du fondateur — envoyée une fois par utilisateur à la complétion du profil.
 * Contenu textuel dans `src/content/emails/onboarding-welcome.content.ts`.
 * Spec de référence : `spec/mkt/emails/onboarding-1-lettre-fondateur.md`.
 */
export function OnboardingWelcomeEmail({
  firstName,
  baseUrl = "https://the-playground.fr",
}: Props) {
  const logoUrl = `${baseUrl}/brand/logo-light.png`;
  const greeting = firstName
    ? content.greeting.replace("{firstName}", firstName)
    : content.greetingFallback;

  return (
    <Html lang="fr">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{content.preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <CenteredLogo src={logoUrl} />
          </Section>

          <Section style={card}>
            <Section style={cardBody}>
              <Text style={paragraph}>{greeting}</Text>

              {content.intro.map((text, i) => (
                <Text
                  key={i}
                  style={
                    i === content.intro.length - 1
                      ? { ...paragraph, marginBottom: "36px" }
                      : paragraph
                  }
                >
                  {text}
                </Text>
              ))}

              <Hr style={divider} />

              <Text style={sectionLabel}>{content.statusLabel}</Text>
              {content.statusParagraphs.map((text, i) => (
                <Text
                  key={i}
                  style={
                    i === content.statusParagraphs.length - 1
                      ? { ...paragraph, marginBottom: "36px" }
                      : paragraph
                  }
                >
                  {text}
                </Text>
              ))}

              <Hr style={divider} />

              <Text style={sectionLabel}>{content.askLabel}</Text>
              {content.askParagraphs.map((text, i) => (
                <Text key={i} style={paragraph}>
                  {text}
                </Text>
              ))}

              <Section style={highlightBox}>
                <Text style={highlightText}>{content.highlight}</Text>
              </Section>

              <Text
                style={{ ...paragraph, marginTop: "16px", marginBottom: 0 }}
              >
                {content.conclusion}
              </Text>
            </Section>

            <Section style={closing}>
              {content.closingParagraphs.map((text, i) => (
                <Text
                  key={i}
                  style={
                    i === content.closingParagraphs.length - 1
                      ? { ...paragraph, marginBottom: "24px" }
                      : paragraph
                  }
                >
                  {text}
                </Text>
              ))}
              <Text style={signature}>{content.signature}</Text>
              <Text style={signatureSubline}>
                {content.signatureSubline} &nbsp;&middot;&nbsp;
                <Link href="https://the-playground.fr" style={signatureLink}>
                  the-playground.fr
                </Link>
              </Text>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>{content.footer}</Text>
            <CenteredLogo src={logoUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Centrage robuste d'une image pour Outlook Word renderer : wrapper
 * `<table align="center">`. `display: block` + `margin: auto` ne fonctionne
 * pas dans Outlook Desktop (2016+).
 */
function CenteredLogo({ src }: { src: string }) {
  return (
    <table
      align="center"
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      border={0}
      style={{ margin: "0 auto", borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td>
            <Img
              src={src}
              width="180"
              height="32"
              alt="The Playground"
              style={logoImg}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Styles ───

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily,
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "600px",
  width: "100%",
  margin: "0 auto",
  padding: "40px 20px 60px",
};

const headerSection: React.CSSProperties = {
  paddingBottom: "24px",
};

const logoImg: React.CSSProperties = {
  display: "block",
  border: 0,
  outline: "none",
  textDecoration: "none",
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  border: "1px solid #e4e4e7",
};

const cardBody: React.CSSProperties = {
  padding: "40px 48px 36px",
};

const paragraph: React.CSSProperties = {
  fontFamily,
  fontSize: "16px",
  color: "#3f3f46",
  lineHeight: "1.7",
  margin: "0 0 16px 0",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "0 0 36px 0",
};

const sectionLabel: React.CSSProperties = {
  fontFamily,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "#a1a1aa",
  margin: "0 0 16px 0",
};

const highlightBox: React.CSSProperties = {
  backgroundColor: "#fdf2f8",
  borderLeft: "3px solid #ec4899",
  borderRadius: "0 8px 8px 0",
  padding: "16px 20px",
  margin: "24px 0 0 0",
};

const highlightText: React.CSSProperties = {
  fontFamily,
  fontSize: "17px",
  fontWeight: 700,
  color: "#18181b",
  lineHeight: "1.5",
  margin: 0,
};

const closing: React.CSSProperties = {
  backgroundColor: "#fafafa",
  borderTop: "1px solid #e4e4e7",
  padding: "32px 48px 36px",
};

const signature: React.CSSProperties = {
  fontFamily,
  fontSize: "15px",
  color: "#18181b",
  fontWeight: 600,
  lineHeight: "1.5",
  margin: "0 0 4px 0",
};

const signatureSubline: React.CSSProperties = {
  fontFamily,
  fontSize: "13px",
  color: "#71717a",
  lineHeight: "1.5",
  margin: 0,
};

const signatureLink: React.CSSProperties = {
  color: "#ec4899",
  textDecoration: "none",
};

const footerSection: React.CSSProperties = {
  paddingTop: "28px",
};

const footerText: React.CSSProperties = {
  fontFamily,
  fontSize: "12px",
  color: "#a1a1aa",
  lineHeight: "1.7",
  margin: "0 0 16px 0",
  textAlign: "center" as const,
};
