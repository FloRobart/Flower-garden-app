import type { Host } from './hosts.types';

import { AppError } from '../../core/models/AppError.model';
import * as hostRepository from './hosts.repository';
import path from 'node:path';
import fs from 'node:fs';



/**
 * Scans hosts and returns liste of available hosts
 * @param host The domain or host to scan
 * @returns A list of available hosts as strings
 */
export async function getSubDomains(host: string): Promise<string> {
	try {
		const normalized = host.replace(/\.+$/g, '').toLowerCase();

		/* Get hosts from certificate transparency logs */
		const hosts = await hostRepository.getAllSubdomains(normalized);

		/* Check which hosts currently resolve */
		const checkedHostsPromise = hosts.map(async (host) => ({ host, ok: await hostRepository.checkHost(host, 1500) }));
		const checkedHosts: string[] = (await Promise.all(checkedHostsPromise)).filter((c) => c.ok).map((c) => c.host);

		/* Filter with name of host */
		const filteredHosts: string[] = checkedHosts.filter(sub => !sub.startsWith('www.'));

		/* Get metadata for filtered hosts */
		const hostsWithMeta: Host[] = await hostRepository.getHostsWithMetaData(filteredHosts, 1500);

		/* Keep only hosts with name or description */
		const filteredHostsWithMeta: Host[] = hostsWithMeta.filter(h => h.name || h.description);

		/* Build HTML page */
		return buildHtmlPage(filteredHostsWithMeta.sort((a, b) => a.host.localeCompare(b.host)));
	} catch (error) {
		throw new AppError('Failed to get hosts', 500);
	}
}


/**
 * Builds a simple HTML page listing the hosts
 * @param hosts The list of hosts to include in the page
 * @returns A string containing the HTML page
 */
function buildHtmlPage(hosts: Host[]): string {
	const hostsTemplatePath = path.join(process.cwd(), "public", "html", "hosts.html");
	const projectTemplatePath = path.join(process.cwd(), "public", "html", "project.html");

	let hostsTemplate = fs.readFileSync(hostsTemplatePath, 'utf8');
	let projectTemplate = fs.readFileSync(projectTemplatePath, 'utf8');

	let projectsHtml = '';
	for (const host of hosts) {
		let projectEntry = projectTemplate.replace(/{{[ ]*TITLE[ ]*}}/g, host.name ?? host.host);
		projectEntry = projectEntry.replace(/{{[ ]*URL[ ]*}}/g, host.host);
		projectEntry = projectEntry.replace(/{{[ ]*DESCRIPTION[ ]*}}/g, host.description ?? 'Aucune description disponible.');
		projectEntry = projectEntry.replace(/{{[ ]*IMAGE[ ]*}}/g, host.icon ?? '../icons/logo_192.png');
		projectsHtml += projectEntry + '\n';
	}

	return hostsTemplate.replace(/{{[ ]*PROJECTS_LIST[ ]*}}/, projectsHtml);
}