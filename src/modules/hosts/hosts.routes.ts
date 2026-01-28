import { Router } from 'express';
import * as HostController from './hosts.controller';



const router = Router();



/**
 * GET /
 * Returns an HTML page listing all projects on the configured domain name
 */
router.get('/', HostController.getHostsProjectsHtmlPage);


/**
 * GET /update
 * Generates and returns an updated HTML page listing all projects on the configured domain name
 */
router.get('/update', HostController.saveHostsProjectsHtmlPage);


/**
 * GET /hosts
 * Returns a list of all projects (Host, Name, Description, Icon) on the configured domain name
 */
router.get('/hosts', HostController.getHostsProjectsList);



export default router;
