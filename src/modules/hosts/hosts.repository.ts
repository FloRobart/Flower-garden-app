import * as dns from 'dns/promises';
import * as https from 'https';



/**
 * Fetches all subdomains from certificate transparency entries for a given domain
 * @param host The domain or subdomain to query
 * @returns A list of subdomains found in certificate transparency logs
 */
export async function getAllSubdomains(host: string): Promise<string[]> {
    const q = `%25.${encodeURIComponent(host)}`; // %25 = %
    const url = `https://crt.sh/?q=${q}&output=json`;

    return new Promise((resolve) => {
        https.get(url, { headers: { 'User-Agent': 'node.js' } }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.debug('crt.sh response entries :', JSON.stringify(json, null, 2));
                    const names: string[] = [];
                    for (const entry of json) {
                        const v = entry.name_value || entry.common_name || '';
                        for (const n of (v as string).split('\n')) {
                            const cleaned = n.trim().replace(/^\*\./, '').toLowerCase();
                            if (cleaned && (cleaned === host || cleaned.endsWith('.' + host))) names.push(cleaned);
                        }
                    }
                    resolve(Array.from(new Set(names)));
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', () => resolve([]));
    });
}


/**
 * Performs a DNS lookup with a timeout for checking if a host resolves
 * @param host The hostname to look up
 * @param ms The timeout in milliseconds
 * @returns A promise that resolves to true if the lookup succeeds within the timeout, otherwise false
 */
export async function checkHost(host: string, ms = 2000): Promise<boolean> {
    return new Promise((resolve) => {
        let settled = false;
        const to = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve(false);
            }
        }, ms);
        dns.lookup(host).then(() => {
            if (!settled) {
                clearTimeout(to);
                settled = true;
                resolve(true);
            }
        }).catch(() => {
            if (!settled) {
                clearTimeout(to);
                settled = true;
                resolve(false);
            }
        });
    });
}


/**
 * Récupère plusieurs types d'enregistrements DNS pour un sous-domaine
 * @param host Le sous-domaine à interroger
 * @returns Un objet contenant les résultats par type (null si introuvable)
 */
async function getDnsRecords(host: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    try { results.A = await dns.resolve4(host); } catch (e) { results.A = null; }
    try { results.AAAA = await dns.resolve6(host); } catch (e) { results.AAAA = null; }
    try { results.CNAME = await dns.resolveCname(host); } catch (e) { results.CNAME = null; }
    try { results.MX = await dns.resolveMx(host); } catch (e) { results.MX = null; }
    try { results.NS = await dns.resolveNs(host); } catch (e) { results.NS = null; }
    try { results.SOA = await dns.resolveSoa(host); } catch (e) { results.SOA = null; }
    try { results.TXT = await dns.resolveTxt(host); } catch (e) { results.TXT = null; }
    try { results.SRV = await dns.resolveSrv(host); } catch (e) { results.SRV = null; }

    try {

        if ((dns as any).resolveNaptr) results.NAPTR = await (dns as any).resolveNaptr(host);
        else results.NAPTR = null;
    } catch (e) { results.NAPTR = null; }

    try {
        if ((dns as any).resolveCaa) results.CAA = await (dns as any).resolveCaa(host);
        else results.CAA = null;
    } catch (e) { results.CAA = null; }

    return results;
}


/**
 * Récupère les enregistrements DNS pour une liste de sous-domaines en parallèle
 * @param hosts Liste de sous-domaines
 * @returns Mapping host -> enregistrements
 */
async function getRecordsForSubdomains(hosts: string[]): Promise<Record<string, Record<string, any>>> {
    const checks = hosts.map(async (h) => ({ h, r: await getDnsRecords(h) }));
    const resolved = await Promise.all(checks);
    const map: Record<string, Record<string, any>> = {};
    for (const e of resolved) map[e.h] = e.r;

    return map;
}