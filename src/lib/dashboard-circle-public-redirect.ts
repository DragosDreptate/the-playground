import { redirect } from "next/navigation";

/**
 * Server-side redirect to the public circle page (throws NEXT_REDIRECT).
 *
 * Used when a visitor reaches a circle's dashboard page without a membership
 * (e.g. an organizer shared the `/dashboard/circles/[slug]` management link
 * instead of the public `/circles/[slug]` one). Bouncing to the public page
 * keeps them in the funnel, with the "Rejoindre" CTA, rather than hitting a 404.
 *
 * No locale prefix: next-intl ("as-needed") resolves it from the NEXT_LOCALE
 * cookie, same as the sibling `redirectToPublicMoment`.
 */
export function redirectToPublicCircle(slug: string): never {
  redirect(`/circles/${slug}`);
}
