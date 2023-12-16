import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
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

if (
	process.env.PUBLIC_TURSO_DATABASE_URL == undefined ||
	process.env.PUBLIC_TURSO_DATABASE_AUTH_TOKEN == undefined
) {
	console.warn(
		"Turso-specific environment variables are not defined in process.env."
	);
}

export const client = createClient({
	url: "file:./me22.db",
	syncUrl: process.env.PUBLIC_TURSO_DATABASE_URL,
	authToken: process.env.PUBLIC_TURSO_DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema: { applicants } });
