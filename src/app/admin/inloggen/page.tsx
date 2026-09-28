import { InlogFormulier } from "./InlogFormulier";

export const dynamic = "force-dynamic";

export default async function InloggenPage({
  searchParams,
}: {
  searchParams: Promise<{ geen_toegang?: string }>;
}) {
  const { geen_toegang } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Beheer — inloggen</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Je ontvangt een inloglink per e-mail.
        </p>
      </div>
      {geen_toegang && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Dit account heeft geen toegang tot het beheer.
        </p>
      )}
      <InlogFormulier />
    </main>
  );
}
