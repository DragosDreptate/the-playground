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
};

/**
 * Should the user be redirected to the welcome page?
 *
 * A user with no circles and no moment registrations (upcoming or past)
 * is considered a brand-new user who should see the welcome / onboarding flow.
 *
 * Used by DashboardContent after fetching data from the three dashboard usecases.
 */
export function shouldRedirectToWelcome(activity: DashboardActivity): boolean {
  return (
    activity.circleCount === 0 &&
    activity.upcomingMomentCount === 0 &&
    activity.pastMomentCount === 0
  );
}
