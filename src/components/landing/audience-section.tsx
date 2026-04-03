import { getTranslations } from "next-intl/server";
import { Mic, Users, Briefcase, BookOpen } from "lucide-react";

const AUDIENCES = [
  { key: 1, icon: Mic },
  { key: 2, icon: Users },
  { key: 3, icon: Briefcase },
  { key: 4, icon: BookOpen },
] as const;

export async function AudienceSection() {
  const t = await getTranslations("HomePage");

  return (
    <section className="bg-muted/60 px-4 py-14 md:py-20">
      <div className="mx-auto max-w-[900px]">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">
          {t("audienceHeading")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {AUDIENCES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex items-start gap-4 rounded-2xl border p-6 transition-colors hover:border-primary/30"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/20">
                <Icon className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {t(`audience${key}Title`)}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {t(`audience${key}Description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
