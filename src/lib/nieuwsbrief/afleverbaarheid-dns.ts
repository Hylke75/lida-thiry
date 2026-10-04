import "server-only";
import { Resolver } from "node:dns/promises";
import { plakTxt, type DnsGegevens } from "./afleverbaarheid";

/** Niet bestaande namen of records zijn geen fout: dan is het record er (nog) niet. */
const LEEG = new Set(["ENODATA", "ENOTFOUND", "ENONAME", "NXDOMAIN"]);

export interface DnsUitkomst {
  gegevens: DnsGegevens;
  /** Opzoekingen die echt mislukten (time-out, server onbereikbaar). */
  fouten: string[];
}

/** Zoekt de records op die we voor SPF, DKIM, DMARC en MX nodig hebben. */
export async function zoekDns(domein: string): Promise<DnsUitkomst> {
  const r = new Resolver({ timeout: 4000, tries: 2 });
  const fouten: string[] = [];

  async function veilig<T>(naam: string, soort: string, f: () => Promise<T[]>): Promise<T[]> {
    try {
      return await f();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (!LEEG.has(code)) fouten.push(`${soort} ${naam}: ${code || (e instanceof Error ? e.message : String(e))}`);
      return [];
    }
  }
  const txt = async (naam: string) => plakTxt(await veilig(naam, "TXT", () => r.resolveTxt(naam)));

  const [spfSubdomein, spfDomein, dkimTxt, dkimCname, dmarc, mx] = await Promise.all([
    txt(`send.${domein}`),
    txt(domein),
    txt(`resend._domainkey.${domein}`),
    veilig(`resend._domainkey.${domein}`, "CNAME", () => r.resolveCname(`resend._domainkey.${domein}`)),
    txt(`_dmarc.${domein}`),
    veilig(`send.${domein}`, "MX", () => r.resolveMx(`send.${domein}`)),
  ]);
  return { gegevens: { spfSubdomein, spfDomein, dkimTxt, dkimCname, dmarc, mx }, fouten };
}
