import dotenv from 'dotenv';
import { type StringValue } from 'ms';
import ms from 'ms';



dotenv.config();



interface AppConfigInterface {
    /* Application configuration */
    readonly app_name: string;
    readonly app_port: number;
    readonly host_name: string;
    readonly base_url: string;
    readonly app_env: string;
    readonly log_format: string;
    readonly domain_name: string;

    /* Rate Limiting */
    readonly request_limit_per_second: number;
    readonly request_limit_time: number;
}

const AppConfig: AppConfigInterface = {
    /* Application configuration */
    app_name: "Flower garden app",
    app_port: 80,
    host_name: process.env.HOST_NAME || 'localhost',
    base_url: process.env.BASE_URL || 'http://localhost:80',
    app_env: process.env.APP_ENV?.toLowerCase() || 'prod',
    log_format: process.env.LOG_FORMAT || 'combined',
    domain_name: process.env.DOMAIN_NAME || (console.log("DOMAIN_NAME is not set"), process.exit(1)),

    /* Rate Limiting */
    request_limit_per_second: Math.round(Number(process.env.REQUEST_LIMIT_PER_SECOND)) || 10,
    request_limit_time: (ms((process.env.REQUEST_LIMIT_TIME as StringValue) || "30min") || (30 * 60 * 1000)),
};



export default AppConfig;