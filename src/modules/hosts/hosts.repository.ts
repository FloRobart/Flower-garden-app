import * as dns from 'dns/promises';
import * as https from 'https';
import { Host } from './hosts.types';
import path from 'node:path';
import fs from 'node:fs';
import AppConfig from '../../config/AppConfig';
import { AppError } from '../../core/models/AppError.model';
import * as os from 'node:os';



/**
 * Returns the HTML page with projects for hosts
 */
export function getHostsProjectsHtmlPage(): string | null {
    try {
        if (fs.existsSync(path.join(process.cwd(), AppConfig.dir_cache_path, AppConfig.file_cache_path))) {
            return fs.readFileSync(path.join(process.cwd(), AppConfig.dir_cache_path, AppConfig.file_cache_path), 'utf8');
        } else {
            if (fs.existsSync(path.join(os.tmpdir(), AppConfig.file_cache_path))) {
                return fs.readFileSync(path.join(os.tmpdir(), AppConfig.file_cache_path), 'utf8');
            }

            return null;
        }
    } catch (error) {
        console.debug(error);
        if (error instanceof AppError) { throw error; }
        throw new AppError('getHostsProjectsHtmlPage failed', 500);
    }
}


/**
 * Fetches all subdomains from certificate transparency entries for a given domain
 * @param host The domain or subdomain to query
 * @returns A list of subdomains found in certificate transparency logs
 */
export async function getHostsProjectsList(host: string): Promise<string[]> {
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
export async function checkHost(host: string, timeout = 6000): Promise<boolean> {
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
export async function getHostsWithMetaData(hosts: string[], currentHost: string, timeout = 6000): Promise<Host[]> {
    try {
        /* Filter out the current host */
        const hostsWithoutCurrentHost = hosts.filter(host => host.toLowerCase() !== currentHost.toLowerCase());

        /* Fetch metadata for each host */
        const hostsWithMetaData = await Promise.all(hostsWithoutCurrentHost.map(async (host: string) => {
            let name: string | undefined;
            let description: string | undefined;
            let icon: string | undefined;

            try {
                const meta = await getMetaData(host, timeout);
                if (meta) {
                    name = meta.name;
                    description = meta.description;
                    icon = meta.icon;
                }
            } catch (e) {
                // Ignore errors
            }

            return { host, name, description, icon } as Host;
        }));

        /* Add current host */
        const currentMetaData = extractDataFromHtml(fs.readFileSync(path.join(process.cwd(), "public", "html", "hosts.html"), 'utf8'));
        hostsWithMetaData.push({ host: currentHost, ...currentMetaData });

        return hostsWithMetaData;
    } catch (error) {
        if (error instanceof AppError) { throw error; }
        throw new AppError('getHostsWithMetaData failed', 500);
    }
}



/*===========*/
/* Utilities */
/*===========*/
/**
 * Fetches metadata (name and description) from a hostname with a timeout
 * @param hostname The hostname to fetch metadata from
 * @param timeout The timeout in milliseconds
 * @returns An object containing the name and description, or null if not found
 */
async function getMetaData(hostname: string, timeout = 6000): Promise<{ name?: string; description?: string; icon?: string } | null> {
    try {
        const html = await fetchHtmlPage(`https://${hostname}`, timeout) ?? await fetchHtmlPage(`http://${hostname}`, timeout);
        if (!html) return null;

        const metaData = extractDataFromHtml(html);
        const icon = await fetchIcon(hostname, timeout) ?? undefined;

        return { ...metaData, icon };
    } catch (error) {
        if (error instanceof AppError) { throw error; }
        throw new AppError('getMetaData failed', 500);
    }
}


/**
 * Fetches the HTML content of a page with a timeout
 * @param url The URL of the page to fetch
 * @param timeout The timeout in milliseconds
 * @returns The HTML content as a string, or null if the fetch fails or times out
 */
async function fetchHtmlPage(url: string, timeout = 6000): Promise<string | null> {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': AppConfig.app_name }});
        if (!res.ok) return null;

        return await res.text();
    } catch (e) {
        return null;
    } finally {
        clearTimeout(to);
    }
}


/**
 * Extracts the title and description from an HTML page
 * @param htmlPage The HTML content of the page
 * @returns An object containing the name and description, or null if not found
 */
function extractDataFromHtml(htmlPage: string): { name?: string; description?: string } | null {
    try {
        /* Get name */
        const name = htmlPage.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
            ?? htmlPage.match(/<meta[^>]+name=["']title["'][^>]*content=["]([^\"]+)["][^>]*>/i)?.[1]?.trim();
        
        /* Get description */
        const description = htmlPage.match(/<meta[^>]+name=["']description["'][^>]*content=["]([^\"]+)["][^>]*>/i)?.[1]?.trim()
            ?? htmlPage.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim();


        return { name, description };
    } catch (error) {
        if (error instanceof AppError) { throw error; }
        throw new AppError('extractDataFromHtml failed', 500);
    }
}


/**
 * Fetches the favicon/icon URL from a hostname
 * @param hostname The hostname to fetch the icon from
 * @param timeout The timeout in milliseconds
 * @returns The icon URL as a string, or null if not found
 */
async function fetchIcon(hostname: string, timeout = 6000): Promise<string | null> {
    try {
        /* Get icon link from HTML */
        const html = await fetchHtmlPage(`https://${hostname}`, timeout) ?? await fetchHtmlPage(`http://${hostname}`, timeout);
        const iconLink = html?.match(/<link[^>]+rel=["']([^"']*icon[^"']*)["'][^>]*href=["']([^"']+)["'][^>]*>/i);

        /* If icon link found, construct full URL */
        if (iconLink) {
            let href = iconLink[2].trim();
            if (href.startsWith('//')) href = 'https:' + href;
            else if (href.startsWith('/')) href = `https://${hostname}${href}`;
            else if (!/^https?:\/\//i.test(href)) href = `https://${hostname}/${href.replace(/^\.\/?/, '')}`;

            return href;
        }

        /* If icon link not found, Try to fetch favicon.ico */
        const defaultHost = `${hostname}/favicon.ico`;

        let href = await fetchHtmlPage(`https://${defaultHost}`, timeout);
        if (href !== null) { return `https://${defaultHost}`; }

        href = await fetchHtmlPage(`http://${defaultHost}`, timeout);
        if (href !== null) { return `http://${defaultHost}`; }

        return href;
    } catch (error) {
        if (error instanceof AppError) { throw error; }
        throw new AppError('fetchIcon failed', 500);
    }
}
