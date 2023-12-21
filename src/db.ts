import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const IS_LOCAL = process.env.IS_LOCAL == "true";
console.log("env.IS_LOCAL =", IS_LOCAL);

if (IS_LOCAL) {
  if (process.env.LOCAL_DB_FILE == undefined) {
    console.warn("env.LOCAL_DB_FILE is undefined");
    process.exit(1);
  }
} else {
  if (
    process.env.TURSO_DATABASE_URL == undefined ||
    process.env.TURSO_DATABASE_AUTH_TOKEN == undefined
  ) {
    console.warn(
      "Turso-specific environment variables are not defined in process.env."
    );
    console.log(
      "Define env.TURSO_DATABASE_URL, env.TURSO_DATABASE_AUTH_TOKEN to resolve this issue."
    );
    process.exit(1);
  }
}
/**
 * @type {Config}
 */
const options = {
  url: IS_LOCAL
    ? `file:${process.env.LOCAL_DB_FILE}`
    : process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_DATABASE_AUTH_TOKEN,
};
console.log(`Using the database at ${options.url}`);

// @ts-expect-error
export const client = createClient(options);

export const db = drizzle(client);
