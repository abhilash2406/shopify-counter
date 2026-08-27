import dotenv from "dotenv";

dotenv.config();

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  mongodbDbName: process.env.MONGODB_DB_NAME || "countdown_timer",
  logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  swagger: {
    user: process.env.SWAGGER_USER || "admin",
    password: process.env.SWAGGER_PASSWORD || "",
  },
};
