import winston from "winston";
import { env, isProduction, isTest } from "./env.js";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;


const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${ts} ${level} ${message}${extra}${stack ? `\n${stack}` : ""}`;
  })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: env.logLevel,
  format: isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  silent: isTest,
});

/**
 * Request logger. Logs on response finish so status and duration are known,
 * and keeps the noisy storefront polling endpoints at debug level.
 */
export function httpLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${
      Date.now() - startedAt
    }ms`;

    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.http(line);
  });

  next();
}
