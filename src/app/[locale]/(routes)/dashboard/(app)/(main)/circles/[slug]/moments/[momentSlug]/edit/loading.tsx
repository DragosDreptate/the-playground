import { DashboardFormSkeleton } from "@/components/dashboard/dashboard-form-skeleton";

// Sans ce loading.tsx, la navigation vers l'édition afficherait le squelette
// de la page détail du moment (via le loading.tsx du segment parent).
export default function MomentEditLoading() {
  return <DashboardFormSkeleton />;
}
