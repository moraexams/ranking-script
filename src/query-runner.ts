import { sql } from "drizzle-orm";
import { outputFile } from "fs-extra";

import { db } from "./db";
import { convertToCSV } from "./helpers";
import { exportFilename } from "./constants";

(async () => {
	const statement = sql.raw(`
	SELECT
			tbl_students.name,
			marks.*,
			tbl_final_results.district_rank,
			tbl_final_results.island_rank
		FROM final_marks_maths AS marks
		JOIN tbl_students
		ON tbl_students.index_no = marks.index_no
		JOIN tbl_final_results
		ON tbl_final_results.index_no = tbl_students.index_no
		WHERE total IS NOT NULL
		ORDER BY total DESC
	`);
	const FILENAME = exportFilename(
		"maths-marks-sheet-with-ranking.csv",
		"for-mayoo-anna"
	);

	const id = "ran 1 statement";
	console.time(id);
	const response = await db.run(statement);
	console.timeEnd(id);
	// @ts-expect-error
	const csv = convertToCSV(response.columns, response.rows, {});

	const d = await outputFile(FILENAME, csv).catch((e) => {
		console.error(e);
		process.exit(1);
	});

	console.log("write: ", FILENAME);
})();
