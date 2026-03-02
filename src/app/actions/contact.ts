"use server";

import { Resend } from "resend";
import type { ActionResult } from "./types";

export async function sendContactMessageAction(
  formData: FormData
): Promise<ActionResult<void>> {
  // Honeypot : un bot remplit ce champ, un humain ne le voit pas
  const honeypot = (formData.get("website") as string | null) ?? "";
  if (honeypot) {
    return { success: true, data: undefined };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!name || !email || !message) {
    return { success: false, error: "Champs requis manquants", code: "VALIDATION_ERROR" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Email invalide", code: "INVALID_EMAIL" };
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY ?? "re_not_configured");

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
    to: "ddreptate@gmail.com",
    replyTo: email,
    subject: `[Contact] Message de ${name}`,
    text: `Nom : ${name}\nEmail : ${email}\n\n${message}`,
    html: `<p><strong>Nom :</strong> ${name}</p><p><strong>Email :</strong> ${email}</p><hr/><p>${message.replace(/\n/g, "<br/>")}</p>`,
  });

  if (error) {
    return { success: false, error: error.message, code: "SEND_ERROR" };
  }

  return { success: true, data: undefined };
}
