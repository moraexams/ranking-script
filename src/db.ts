import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { Config } from "@libsql/client";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applicants = sqliteTable("tbl_students", {
	id: text("index_no", { length: 50, mode: "text" }).notNull(),
	name: text("name", { length: 255, mode: "text" }),
	// email: text("email", { length: 255, mode: "text" }),
	nic: text("nic", { length: 15, mode: "text" }).notNull(),
});

// export type Applicant = {
// 	id: string;
// 	name: string;
// 	email: string;
// 	nic: string;
// };

const IS_LOCAL = process.env.IS_LOCAL == "true";
console.log("env.IS_LOCAL =", IS_LOCAL);

if (IS_LOCAL) {
	if (process.env.LOCAL_DB_FILE == undefined) {
		console.warn("env.LOCAL_DB_FILE is undefined");
		process.exit(1);
	}
} else {
	if (
		process.env.PUBLIC_TURSO_DATABASE_URL == undefined ||
		process.env.PUBLIC_TURSO_DATABASE_AUTH_TOKEN == undefined
	) {
		console.warn(
			"Turso-specific environment variables are not defined in process.env."
		);
		console.log(
			"Define env.PUBLIC_TURSO_DATABASE_URL, env.PUBLIC_TURSO_DATABASE_AUTH_TOKEN to resolve this issue."
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
		: process.env.PUBLIC_TURSO_DATABASE_URL,
	authToken: process.env.PUBLIC_TURSO_DATABASE_AUTH_TOKEN,
};
console.log(`Using the database at ${options.url}`);

// @ts-expect-error
export const client = createClient(options);

export const db = drizzle(client, { schema: { applicants } });
