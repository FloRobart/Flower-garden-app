import type { Host } from './hosts.types';

import { AppError } from '../../core/models/AppError.model';
import * as hostRepository from './hosts.repository';
import path from 'node:path';
import fs from 'node:fs';
import * as os from 'node:os';
import AppConfig from '../../config/AppConfig';



/**
 * Returns the HTML page with all projects for hosts
 * @param host The domain or host to scan
 * @param currentHost The current host making the request
 * @returns A string containing the HTML page
 */
export async function getHostsProjectsHtmlPage(host: string, currentHost: string): Promise<string> {
	try {
		const hostsProjectsHtmlPage: string | null = hostRepository.getHostsProjectsHtmlPage();

		if (hostsProjectsHtmlPage === null) {
			return await saveHostsProjectsHtmlPage(host, currentHost);
		}

		return hostsProjectsHtmlPage;
	} catch (error) {
		if (error instanceof AppError) { throw error; }
		throw new AppError('getHostsProjectsHtmlPage failed', 500);
	}
}


/**
 * Scans hosts and returns liste of available hosts
 * @param host The domain or host to scan
 * @param currentHost The current host making the request
 * @returns A string containing the HTML page
 */
export async function saveHostsProjectsHtmlPage(host: string, currentHost: string): Promise<string> {
	try {
		const filteredHostsWithMeta: Host[] = (await getHostsProjectsList(host, currentHost))
			.sort((a, b) => a.host.localeCompare(b.host));

		/* Build HTML page */
		const htmlPage = buildHtmlPage(filteredHostsWithMeta);

		/* Save HTML page to file */
		const outputPath = path.join(process.cwd(), AppConfig.dir_cache_path, AppConfig.file_cache_path);

		/* Ensure output directory exists */
		const outputDir = path.dirname(outputPath);
		try {
			fs.mkdirSync(outputDir, { recursive: true });
		} catch (err) {
			/* Ignore error if directory already exists */
		}

		try {
			fs.writeFileSync(outputPath, htmlPage, 'utf8');
		} catch (err: any) {
			if (err && err.code === 'EACCES') {
				const fallbackPath = path.join(os.tmpdir(), AppConfig.file_cache_path);
				try {
					fs.writeFileSync(fallbackPath, htmlPage, 'utf8');
				} catch (err2) {
					throw err;
				}
			} else {
				throw err;
			}
		}

		/* Return HTML page */
		return htmlPage;
	} catch (error) {
		if (error instanceof AppError) { throw error; }
		throw new AppError('saveHostsProjectsHtmlPage failed', 500);
	}
}


/**
 * Scans hosts and returns liste of available hosts
 * @param host The domain or host to scan
 * @param currentHost The current host making the request
 * @returns A list of available hosts as strings
 */
export async function getHostsProjectsList(host: string, currentHost: string): Promise<Host[]> {
	try {
		const normalized = host.replace(/\.+$/g, '').toLowerCase();

		/* Get hosts from certificate transparency logs */
		const hosts = await hostRepository.getHostsProjectsList(normalized);

		/* Check which hosts currently resolve */
		const checkedHostsPromise = hosts.map(async (host) => ({ host, ok: await hostRepository.checkHost(host) }));
		const checkedHosts: string[] = (await Promise.all(checkedHostsPromise)).filter((c) => c.ok).map((c) => c.host);

		/* Filter with name of host */
		const filteredHosts: string[] = checkedHosts.filter(sub => !sub.startsWith('www.'));

		/* Get metadata for filtered hosts */
		const hostsWithMeta: Host[] = await hostRepository.getHostsWithMetaData(filteredHosts, currentHost);

		/* Keep only hosts with name or description (for exclude server) */
		const filteredHostsWithMeta: Host[] = hostsWithMeta.filter(h => h.name || h.description);

		/* Build HTML page */
		return filteredHostsWithMeta.sort((a, b) => a.host.localeCompare(b.host));
	} catch (error) {
		if (error instanceof AppError) { throw error; }
		throw new AppError('getHostsProjectsList failed', 500);
	}
}



/*===========*/
/* Utilities */
/*===========*/
/**
 * Builds a simple HTML page listing the hosts
 * @param hosts The list of hosts to include in the page
 * @returns A string containing the HTML page
 */
function buildHtmlPage(hosts: Host[]): string {
	try {
		const hostsTemplatePath = path.join(process.cwd(), "public", "html", "hosts.html");
		const projectTemplatePath = path.join(process.cwd(), "public", "html", "project.html");

		let hostsTemplate = fs.readFileSync(hostsTemplatePath, 'utf8');
		let projectTemplate = fs.readFileSync(projectTemplatePath, 'utf8');

		hostsTemplate = hostsTemplate.replace(/{{[ ]*CURRENT_YEAR[ ]*}}/g, new Date().getFullYear().toString());

		let projectsHtml = '';
		for (const host of hosts) {
			let projectEntry = projectTemplate.replace(/{{[ ]*TITLE[ ]*}}/g, host.name ?? host.host);
			projectEntry = projectEntry.replace(/{{[ ]*URL[ ]*}}/g, host.host);
			projectEntry = projectEntry.replace(/{{[ ]*DESCRIPTION[ ]*}}/g, host.description ?? 'Aucune description disponible.');
			projectEntry = projectEntry.replace(/{{[ ]*IMAGE[ ]*}}/g, host.icon ?? '../icons/logo_192.png');
			projectsHtml += projectEntry + '\n';
		}

		return hostsTemplate.replace(/{{[ ]*PROJECTS_LIST[ ]*}}/, projectsHtml);
	} catch (error) {
		if (error instanceof AppError) { throw error; }
		throw new AppError('buildHtmlPage failed', 500);
	}
}
