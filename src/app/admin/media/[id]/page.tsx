import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { haalMedia, mediaMappen, zoekGebruik } from "@/lib/media/beheer";
import type { Gebruik } from "@/lib/media/regels";
import { AdminNav } from "../../AdminNav";
import { Melding } from "../../Melding";
import { MediaDetail } from "./MediaDetail";

export const dynamic = "force-dynamic";

export default async function MediaBekijken({ params }: { params: Promise<{ id: string }> }) {
  await vereisBeheerder();
  const { id } = await params;
  const media = await haalMedia(id);
  if (!media) notFound();

  const [mappen, gevonden] = await Promise.all([
    mediaMappen(),
    zoekGebruik(media).then(
      (g): { gebruik: Gebruik[] | null; fout: string | null } => ({ gebruik: g, fout: null }),
      (e: unknown) => ({ gebruik: null, fout: e instanceof Error ? e.message : "onbekende fout" }),
    ),
  ]);
  const { gebruik, fout: gebruikFout } = gevonden;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav />
      <nav aria-label="Kruimelpad" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-black/55 dark:text-white/55">
        <Link href="/admin/media" className="hover:text-accent hover:underline">
          Mediabibliotheek
        </Link>
        <span aria-hidden>›</span>
        <span className="max-w-[16rem] truncate">{media.naam}</span>
      </nav>
      {gebruikFout && <Melding soort="fout">Er kon niet worden nagekeken waar deze afbeelding gebruikt wordt ({gebruikFout}).</Melding>}
      <MediaDetail media={media} gebruik={gebruik} mappen={mappen} />
    </main>
  );
}
