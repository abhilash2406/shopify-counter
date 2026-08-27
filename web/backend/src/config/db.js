import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./winston.js";


// database connection pool
let connectionPromise = null;

export function connectDb() {
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.mongodbUri, { dbName: env.mongodbDbName })
      .then((conn) => {
        logger.info(`MongoDB connected [db: ${env.mongodbDbName}]`);
        return conn;
      })
      .catch((error) => {
        connectionPromise = null;
        logger.error("MongoDB connection failed", error);
        throw error;
      });
  }
  return connectionPromise;
}
