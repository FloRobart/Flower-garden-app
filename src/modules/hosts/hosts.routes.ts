import { Router } from 'express';
import * as HostController from './hosts.controller';



const router = Router();



/**
 * GET /hosts
 * Returns a list of subdomains for the configured domain name
 */
router.get('/', HostController.hosts);



export default router;
