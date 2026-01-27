import express from 'express';
import { Request } from 'express';
import homeRoutes from './modules/hosts/hosts.routes';
import { errorHandler } from './core/middlewares/error.middleware';
import AppConfig from './config/AppConfig';
import { limiter } from './core/middlewares/rate_limiter.middleware';
import { defaultRouteHandler } from './core/middlewares/default_route.middleware';
import path from 'node:path';
import helmet from 'helmet';
import { helmetOptions } from './core/middlewares/helmet_http_headers.middleware';
import morgan from 'morgan';



const app = express();



/* Security headers (Helmet) */
app.use(helmet(helmetOptions));

/* Trust proxy in production */
if (AppConfig.app_env.includes('prod')) {
    app.set('trust proxy', 1);
}

/* Rate Limiter */
app.use(limiter);

/* Body parser */
app.use(express.json());

/* Favicon */
app.get("/favicon.ico", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "icons", "favicon.ico"));
});

/* Logger */
app.use(morgan(AppConfig.log_format));


/* Home routes */
app.use('/', homeRoutes);

/* Static public files */
app.use(express.static(path.join(process.cwd(), "public")));


/* Default Route Handler (404) */
app.use(defaultRouteHandler);

/* Error Handler */
app.use(errorHandler);



export default app;