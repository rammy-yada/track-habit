import "server-only";
import { resolve4, resolveMx } from "node:dns/promises";

/**
 * Does this address's domain accept mail at all? Only a clear "no such
 * domain" or "no mail server" counts as no: if the lookup itself fails or is
 * slow, the address is given the benefit of the doubt.
 */
export async function domainTakesMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const gone = (err: unknown) => ["ENOTFOUND", "ENODATA"].includes((err as { code?: string }).code ?? "");
  const lookup = async () => {
    try {
      const servers = await resolveMx(domain);
      // a "null MX" (one record with an empty host) is a domain saying it takes no mail
      if (servers.length > 0) return servers.some((record) => record.exchange && record.exchange !== ".");
    } catch (err) {
      if (!gone(err)) return true;
    }
    // no MX record: mail falls back to the domain's own address, if it has one
    return resolve4(domain).then(
      (found) => found.length > 0,
      (err) => !gone(err),
    );
  };
  return Promise.race([lookup(), new Promise<boolean>((done) => setTimeout(() => done(true), 2500))]);
}
