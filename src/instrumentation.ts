import type { Instrumentation } from "next";

/**
 * Serverfouten (pagina's, route handlers, server actions, proxy) komen in de
 * eigen foutlog (Beheer → Instellingen → Fouten), met pad en digest. De digest
 * staat ook op de foutpagina die de bezoeker ziet, zodat die te koppelen is.
 * Alleen in de Node.js-runtime: de foutlog gebruikt node:crypto en de
 * service-role-client.
 */
export const onRequestError: Instrumentation.onRequestError = async (fout, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const digest =
    typeof fout === "object" && fout !== null && "digest" in fout ? String((fout as { digest: unknown }).digest) : null;
  // Interne signalen van Next (redirect, notFound, dynamic rendering) zijn geen fouten.
  if (digest && /^(NEXT_|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/.test(digest)) return;
  const { registreerFout } = await import("./lib/fouten/registreer");
  await registreerFout({
    bron: "server",
    fout,
    pad: request.path,
    digest,
    details: {
      methode: request.method,
      route: context.routePath,
      soort: context.routeType,
      ...(context.renderSource ? { render: context.renderSource } : {}),
    },
  });
};
