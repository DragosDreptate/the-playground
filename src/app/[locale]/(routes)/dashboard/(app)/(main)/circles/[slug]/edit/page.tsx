import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getStripeConnectStatus } from "@/domain/usecases/onboard-stripe-connect";
import { CircleNotFoundError } from "@/domain/errors";
import { CircleForm } from "@/components/circles/circle-form";
import { updateCircleAction } from "@/app/actions/circle";
import { getCachedSession } from "@/lib/auth-cache";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { isActiveOrganizer, isActivePrimaryHost } from "@/domain/models/circle";
import { redirectToPublicCircle } from "@/lib/dashboard-circle-public-redirect";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

export default async function EditCirclePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let circle;
  try {
    circle = await getCircleBySlug(slug, {
      circleRepository: prismaCircleRepository,
    });
  } catch (error) {
    if (error instanceof CircleNotFoundError) {
      notFound();
    }
    throw error;
  }

  // Garde d'autorisation : seul un organisateur actif de la Communauté peut
  // éditer. Un non-membre (ou un membre Participant) est renvoyé vers la page
  // publique, comme sur les pages de gestion sœurs.
  const session = await getCachedSession();
  if (!session?.user?.id) redirectToPublicCircle(slug);

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
  const membership = await circleRepo.findMembership(circle.id, session.user.id);

  if (!isActiveOrganizer(membership)) redirectToPublicCircle(slug);

  const boundAction = updateCircleAction.bind(null, circle.id);

  // Load Stripe Connect status for the HOST (supports admin host mode)
  const canManageStripe = isActivePrimaryHost(membership);

  let stripeConnect;
  if (canManageStripe) {
    // Default: no account (shows "Activer les paiements" button)
    let hasAccount = false;
    let status = null as import("@/domain/ports/services/payment-service").ConnectAccountStatus | null;

    // If circle already has a Stripe account, fetch its status
    if (circle.stripeConnectAccountId) {
      try {
        const stripeStatus = await getStripeConnectStatus(
          { circleId: circle.id, userId: session.user.id },
          { circleRepository: prismaCircleRepository, paymentService: createStripePaymentService() }
        );
        hasAccount = stripeStatus.hasAccount;
        status = stripeStatus.status;
      } catch {
        // Stripe API error — show as "has account but unknown status"
        hasAccount = true;
        status = "pending";
      }
    }

    stripeConnect = {
      circleId: circle.id,
      circleSlug: circle.slug,
      hasAccount,
      status,
    };
  }

  const tDashboard = await getTranslations("Dashboard");
  const tCommon = await getTranslations("Common");

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          {tDashboard("title")}
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/dashboard/circles/${slug}`}
          className="hover:text-foreground transition-colors"
        >
          {circle.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground truncate font-medium">
          {tCommon("edit")}
        </span>
      </div>
      <CircleForm circle={circle} action={boundAction} stripeConnect={stripeConnect} />
    </div>
  );
}
