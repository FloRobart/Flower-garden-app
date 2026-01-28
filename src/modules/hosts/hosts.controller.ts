import type { Host } from './hosts.types';

import { Request, Response, NextFunction } from 'express';
import * as hostService from './hosts.service';
import AppConfig from '../../config/AppConfig';



/**
 * Returns a html page with all project on my domain name.
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export const getHostsProjectsHtmlPage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const htmlPage: string = await hostService.getHostsProjectsHtmlPage(AppConfig.domain_name, req.hostname || req.headers.host || '');
        res.status(200).send(htmlPage);
    } catch (error) {
        next(error);
    }
}


/**
 * Generate and returns a html page with all project on my domain name.
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export const saveHostsProjectsHtmlPage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const htmlPage: string = await hostService.saveHostsProjectsHtmlPage(AppConfig.domain_name, req.hostname || req.headers.host || '');
        res.status(200).send(htmlPage);
    } catch (error) {
        next(error);
    }
}


/**
 * Returns a list of all projects on my domain name.
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export const getHostsProjectsList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hosts: Host[] = await hostService.getHostsProjectsList(AppConfig.domain_name, req.hostname || req.headers.host || '');
        res.status(200).json(hosts);
    } catch (error) {
        next(error);
    }
}