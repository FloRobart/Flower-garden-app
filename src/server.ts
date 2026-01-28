import app from './app';
import AppConfig from './config/AppConfig';
import http from 'http';
import * as logger from './core/utils/logger';
import cron from 'node-cron';
import { saveHostsProjectsHtmlPage } from './modules/hosts/hosts.service';



(async () => {
    /*=================*/
    /* Cron Jobs Setup */
    /*=================*/
    if (AppConfig.app_env.includes('prod')) {
        cron.schedule('0 3 * * *', async () => {
            try {
                logger.info("Starting subscription operations generation job");
                await saveHostsProjectsHtmlPage(AppConfig.domain_name, AppConfig.base_url.replace(/^https?:\/\//, ''));
                logger.success("Subscription operations generation job completed");
            } catch (error) {
                logger.error(error);
            }
        });
    }


    /*==================*/
    /* Écoute du server */
    /*==================*/
    const server = http.createServer(app);

    server.listen(AppConfig.app_port, AppConfig.host_name, () => {
        logger.success("Server running at PORT :", AppConfig.app_port, "!");
        logger.success("Server running at URL :", AppConfig.base_url, "!");
        logger.success("Server documentation running at URL :", AppConfig.base_url + "/api-docs", "!");
    });

    server.on("error", (error: Error) => {
        logger.error("FAILED STARTING SERVER\n");
        logger.error(error);
        process.exit(1);
    });
})();