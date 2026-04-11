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

type Props = {
  firstName: string | null;
  /**
   * Base URL absolue utilisée pour le logo. En dev, le lab preview passe
   * `http://localhost:3000` ; en prod, la resend-email-service passe
   * `https://the-playground.fr` via `getBaseUrl()`. Un défaut prod est fourni
   * pour les callers qui n'ont pas besoin de le surcharger.
   */
  baseUrl?: string;
};

/**
 * Lettre du fondateur — envoyée une fois par utilisateur à la complétion du profil.
 * Contenu hardcodé en français et tutoiement (lettre d'humain à humain).
 * Voir `spec/mkt/emails/onboarding-1-lettre-fondateur.md` pour le contenu validé.
 *
 * Compat email clients : Gmail (web/app), Apple Mail (macOS/iOS), Outlook
 * (2016/2019/365/web), Yahoo, Proton, Thunderbird. Pas de flex/grid,
 * pas de SVG, pas de web font, pas de JS. Centrage images via `align="center"`
 * sur table wrapper (fallback Outlook Word renderer).
 */
export function OnboardingWelcomeEmail({
  firstName,
  baseUrl = "https://the-playground.fr",
}: Props) {
  const greeting = `Bonjour ${firstName ?? "à toi"},`;
  // logo-light = logo pensé pour un fond clair (texte "the" en #1a1b2e).
  // L'email a un fond #f4f4f5 et la card en blanc — donc version light.
  const logoUrl = `${baseUrl}/brand/logo-light.png`;

  return (
    <Html lang="fr">
      <Head>
        {/* Force light mode — empêche Apple Mail iOS / Outlook mobile
            d'auto-inverser les couleurs (texte gris illisible sur card inversée) */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Une histoire de conviction — et ce que je te demande.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <CenteredLogo src={logoUrl} />
          </Section>

          <Section style={card}>
            <Section style={cardBody}>
              <Text style={paragraph}>{greeting}</Text>

              <Text style={paragraph}>
                Il y a quelque chose que j&apos;aimerais partager avec toi.
              </Text>

              <Text style={paragraph}>
                J&apos;ai construit The Playground parce que j&apos;en avais
                marre de voir des organisateurs se faire plumer. Meetup qui
                facture des abonnements pour accéder à sa propre communauté.
                Luma, élégant mais sans mémoire — chaque événement repart de
                zéro, aucun lien qui dure.
              </Text>
              <Text style={paragraph}>
                Les gens qui animent des communautés font quelque chose
                d&apos;utile. Ils méritent un outil à la hauteur — gratuit,
                français, au code ouvert, où les communautés qu&apos;ils
                animent restent les leurs.
              </Text>
              <Text style={paragraphLast}>
                C&apos;est ça, The Playground. Rien de plus, rien de moins.
              </Text>

              <Hr style={divider} />

              <Text style={sectionLabel}>Où on en est</Text>
              <Text style={paragraph}>
                L&apos;app tourne. La structure est solide, les fonctionnalités
                sont là. Mais une plateforme pour les communautés sans
                communautés, ça ne prouve rien à personne — ni aux
                organisateurs qui hésitent, ni à moi.
              </Text>
              <Text style={paragraph}>
                Ce qu&apos;il manque, ce sont les premières vraies communautés
                qui vivent, qui grandissent, dont les membres reviennent.
              </Text>
              <Text style={paragraphLast}>
                Tu as créé un compte. Ça veut dire que quelque chose a résonné.
                Et ça compte.
              </Text>

              <Hr style={divider} />

              <Text style={sectionLabel}>
                Ce que j&apos;aimerais te demander
              </Text>
              <Text style={paragraph}>
                Pas un like. Pas un partage (même si je ne le refuserais pas).
              </Text>
              <Text style={paragraph}>
                Juste ça : si tu penses à quelqu&apos;un qui organise des
                événements régulièrement — un meetup, un atelier, un réseau
                pro, des moments informels, peu importe — parle-lui de The
                Playground.
              </Text>

              <Section style={highlightBox}>
                <Text style={highlightText}>
                  Une personne. Une conversation.
                </Text>
              </Section>

              <Text style={paragraphHighlightAfter}>
                C&apos;est comme ça que les outils qui durent se construisent.
              </Text>
            </Section>

            <Section style={closing}>
              <Text style={paragraph}>
                Si tu as envie de répondre, fais-le. Je lis tout et je réponds
                personnellement.
              </Text>
              <Text style={paragraphThankYou}>Merci d&apos;être là.</Text>
              <Text style={signature}>— Dragos</Text>
              <Text style={signatureSubline}>
                Fondateur de The Playground &nbsp;·&nbsp;
                <Link href="https://the-playground.fr" style={signatureLink}>
                  the-playground.fr
                </Link>
              </Text>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              Tu reçois cet email car tu as créé un compte sur The Playground.
            </Text>
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

const paragraphLast: React.CSSProperties = {
  ...paragraph,
  margin: "0 0 36px 0",
};

const paragraphHighlightAfter: React.CSSProperties = {
  ...paragraph,
  margin: "16px 0 0 0",
};

const paragraphThankYou: React.CSSProperties = {
  ...paragraph,
  margin: "0 0 24px 0",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  borderBottom: "none",
  borderLeft: "none",
  borderRight: "none",
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
