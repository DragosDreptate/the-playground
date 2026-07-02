import { MomentDetailSkeleton } from "@/components/moments/moment-detail-skeleton";

export default function MomentLoading() {
  // Le layout `/m` ne pose pas de conteneur (la vraie page porte son `<main>`),
  // donc le squelette doit reproduire le même cadrage que la page.
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <MomentDetailSkeleton />
    </main>
  );
}
