import type { Host } from './hosts.types';

import { Request, Response, NextFunction } from 'express';
import * as hostService from './hosts.service';
import AppConfig from '../../config/AppConfig';



/**
 * Returns a html page with all project on my domain name.
 * @param _req not used
 * @param res Response
 * @param next NextFunction
 */
export const hosts = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const htmlPage: string = await hostService.getSubDomains(AppConfig.domain_name);
        res.status(200).send(htmlPage);
    } catch (error) {
        next(error);
    }
}