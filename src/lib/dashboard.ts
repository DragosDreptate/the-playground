/**
 * Dashboard routing logic — pure functions.
 *
 * These encode the redirect rules for the dashboard content component.
 * Extracted from DashboardContent (app layer) to be testable in isolation.
 */

type DashboardActivity = {
  circleCount: number;
  upcomingMomentCount: number;
  pastMomentCount: number;
  dashboardMode: "PARTICIPANT" | "ORGANIZER" | null;
};

/**
 * Should the user be redirected to the welcome page?
 *
 * A user is redirected to welcome ONLY when:
 * - They haven't chosen a dashboard mode yet (`dashboardMode === null`)
 * - AND they have no activity at all (no circles, no registrations)
 *
 * Users who have already set a mode, or who have activity (regardless of mode),
 * are NOT redirected to welcome.
 */
export function shouldRedirectToWelcome(activity: DashboardActivity): boolean {
  return (
    activity.dashboardMode === null &&
    activity.circleCount === 0 &&
    activity.upcomingMomentCount === 0 &&
    activity.pastMomentCount === 0
  );
}
