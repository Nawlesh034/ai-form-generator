import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql", // "mysql" | "sqlite" | "postgresql"
  schema: "./config/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url:"postgresql://neondb_owner:RNxgjuw4md2F@ep-flat-waterfall-a18fi8mh.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  }
});

