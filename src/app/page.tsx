import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-black/50 dark:border-white/15 dark:text-white/50">
          Klaar om te bouwen
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          lida-thiry
        </h1>
        <p className="max-w-md text-balance text-black/60 dark:text-white/60">
          Next.js (App Router) + TypeScript + Tailwind CSS, gekoppeld aan
          Supabase. Het fundament staat — begin hier met bouwen.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/status"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Verbindingsstatus
        </Link>
        <a
          href="https://supabase.com/dashboard/project/hzuhkollroehnrsghyax"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Supabase-dashboard
        </a>
      </div>
    </main>
  );
}
