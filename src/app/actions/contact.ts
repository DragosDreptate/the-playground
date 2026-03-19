"use server";

import { Resend } from "resend";
import type { ActionResult } from "./types";

export async function sendContactMessageAction(
  formData: FormData
): Promise<ActionResult<void>> {
  // Honeypot : un bot remplit ce champ, un humain ne le voit pas
  const honeypot = (formData.get("_info") as string | null) ?? "";
  if (honeypot) {
    return { success: true, data: undefined };
  }

  const firstName = (formData.get("firstName") as string | null)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string | null)?.trim() ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!name || !email || !message) {
    return { success: false, error: "MISSING_FIELDS", code: "VALIDATION_ERROR" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "INVALID_EMAIL", code: "INVALID_EMAIL" };
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY ?? "re_not_configured");
  const from = process.env.EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: "ddreptate@gmail.com",
      replyTo: email,
      subject: `[Contact] ${subject ? subject + " — " : ""}Message de ${name}`,
      text: `Nom : ${name}\nEmail : ${email}\nSujet : ${subject || "—"}\n\n${message}`,
      html: `<p><strong>Nom :</strong> ${name}</p><p><strong>Email :</strong> ${email}</p><p><strong>Sujet :</strong> ${subject || "—"}</p><hr/><p>${message.replace(/\n/g, "<br/>")}</p>`,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return { success: false, error: error.message, code: "SEND_ERROR" };
    }

    console.log("[contact] Email envoyé, id:", data?.id);
  } catch (err) {
    console.error("[contact] Exception Resend:", err);
    return { success: false, error: "SEND_ERROR", code: "SEND_ERROR" };
  }

  return { success: true, data: undefined };
}
