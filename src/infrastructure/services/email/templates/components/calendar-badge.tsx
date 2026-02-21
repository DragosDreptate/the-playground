import { Section, Text } from "@react-email/components";
import * as React from "react";

type CalendarBadgeProps = {
  month: string;
  day: string;
};

export function CalendarBadge({ month, day }: CalendarBadgeProps) {
  return (
    <Section style={badge}>
      <Text style={monthStyle}>{month.toUpperCase()}</Text>
      <Text style={dayStyle}>{day}</Text>
    </Section>
  );
}

const badge: React.CSSProperties = {
  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  borderRadius: "12px",
  width: "64px",
  height: "64px",
  textAlign: "center" as const,
  margin: "0 auto 16px auto",
  padding: "0",
};

const monthStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.85)",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0",
  padding: "8px 0 0 0",
  lineHeight: "1",
};

const dayStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 700,
  margin: "0",
  padding: "2px 0 0 0",
  lineHeight: "1",
};
