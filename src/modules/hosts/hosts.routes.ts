import { Router } from 'express';
import * as HostController from './hosts.controller';



const router = Router();



/**
 * GET /
 * Returns a list of subdomains for the configured domain name
 */
router.get('/', HostController.hostsHtml);


/**
 * GET /hosts
 * Returns a list of all projects on the configured domain name
 */
router.get('/hosts', HostController.hostsList);



export default router;
