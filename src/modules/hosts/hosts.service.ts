import type { Host } from './hosts.types';

import { AppError } from '../../core/models/AppError.model';
import * as hostRepository from './hosts.repository';



/**
 * Scans subdomains and returns liste of available subdomains
 * @param host The domain or subdomain to scan
 * @returns A list of available subdomains as strings
 */
export async function getSubDomains(host: string): Promise<Host[]> {
	try {
		const normalized = host.replace(/\.+$/g, '').toLowerCase();

		/* Get subdomains from certificate transparency logs */
		const crtResults = await hostRepository.getAllSubdomains(normalized);

		/* Check which subdomains currently resolve */
		const checks = crtResults.map(async (host) => ({ host, ok: await hostRepository.checkHost(host, 1500) }));
		const checked = await Promise.all(checks);

		/* Filter and return only resolving subdomains (only active domains) */
		const resolving = checked.filter((c) => c.ok).map((c) => c.host);

		/* Filter with name of subdomain */
		const filtered = resolving.filter(sub =>
			sub !== normalized && // enlève le domaine racine
			!sub.startsWith('www.') // enlève les www
		);

		/* Return the list of subdomains */
		return filtered.sort((a, b) => a.localeCompare(b));
	} catch (error) {
		throw new AppError('Failed to get subdomains', 500);
	}
}
