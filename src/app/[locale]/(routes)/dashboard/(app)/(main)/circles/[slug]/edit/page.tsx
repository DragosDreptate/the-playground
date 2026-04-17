import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getStripeConnectStatus } from "@/domain/usecases/onboard-stripe-connect";
import { CircleNotFoundError } from "@/domain/errors";
import { CircleForm } from "@/components/circles/circle-form";
import { updateCircleAction } from "@/app/actions/circle";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { isActivePrimaryHost } from "@/domain/models/circle";
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

  const boundAction = updateCircleAction.bind(null, circle.id);

  // Load Stripe Connect status for the HOST (supports admin host mode)
  const session = await auth();
  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
  const membership = session?.user?.id
    ? await circleRepo.findMembership(circle.id, session.user.id)
    : null;
  const canManageStripe = isActivePrimaryHost(membership);

  let stripeConnect;
  if (canManageStripe) {
    // Default: no account (shows "Activer les paiements" button)
    let hasAccount = false;
    let status = null as import("@/domain/ports/services/payment-service").ConnectAccountStatus | null;

    // If circle already has a Stripe account, fetch its status
    if (circle.stripeConnectAccountId && session?.user?.id) {
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
