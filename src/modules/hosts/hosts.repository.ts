import * as dns from 'dns/promises';
import * as https from 'https';
import { Host } from './hosts.types';



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
 * @param timeout The timeout in milliseconds
 * @returns A promise that resolves to true if the lookup succeeds within the timeout, otherwise false
 */
export async function checkHost(host: string, timeout = 2000): Promise<boolean> {
    return new Promise((resolve) => {
        let settled = false;
        const to = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve(false);
            }
        }, timeout);
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
 * Fetches metadata (name and description) for multiple hosts with a timeout
 * @param hosts The list of hostnames to fetch metadata for
 * @param timeout The timeout in milliseconds for each metadata fetch
 * @returns A promise that resolves to an array of Host objects with metadata
 */
export async function getHostsWithMetaData(hosts: string[], timeout = 2000): Promise<Host[]> {
    return Promise.all(hosts.map(async (host: string) => {
        let name: string | undefined;
        let description: string | undefined;
        let icon: string | undefined;

        try {
            const meta = await fetchMetaData(host, timeout);
            if (meta) {
                name = meta.name;
                description = meta.description;
                icon = meta.icon;
            }
        } catch (e) {
            throw e;
        }

        return { host, name, description, icon } as Host;
    }));
}

/**
 * Fetches metadata (name and description) from a hostname with a timeout
 * @param hostname The hostname to fetch metadata from
 * @param timeout The timeout in milliseconds
 * @returns An object containing the name and description, or null if not found
 */
async function fetchMetaData(hostname: string, timeout = 2000): Promise<{ name?: string; description?: string; icon?: string } | null> {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeout);
    try {
        const tryFetch = async (url: string) => {
            try {
                const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'node.js' } as any });
                if (!res.ok) return null;
                return await res.text();
            } catch {
                return null;
            }
        };

        const html = await tryFetch(`https://${hostname}`) ?? await tryFetch(`http://${hostname}`);
        if (!html) return null;

        const name = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
        const description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["]([^\"]+)["][^>]*>/i)?.[1]?.trim()
            ?? html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim();

        // Try to find favicon from HTML <link> tags
        let icon: string | undefined;
        const linkMatch = html.match(/<link[^>]+rel=["']([^"']*icon[^"']*)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
        if (linkMatch) {
            let href = linkMatch[2].trim();
            if (href.startsWith('//')) href = 'https:' + href;
            else if (href.startsWith('/')) href = `https://${hostname}${href}`;
            else if (!/^https?:\/\//i.test(href)) href = `https://${hostname}/${href.replace(/^\.\/?/, '')}`;
            icon = href;
        } else {
            // Fallback to /favicon.ico if it exists
            const fav = await tryFetch(`https://${hostname}/favicon.ico`) ?? await tryFetch(`http://${hostname}/favicon.ico`);
            if (fav !== null) icon = `https://${hostname}/favicon.ico`;
        }

        return { name, description, icon };
    } finally {
        clearTimeout(to);
    }
}
