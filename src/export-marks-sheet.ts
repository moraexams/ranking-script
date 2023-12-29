import { sql } from "drizzle-orm";

import { convertToCSV, runStatements } from "./helpers";
import { SUBJECTS, Subject } from "./types";
import { outputFile } from "fs-extra";

const EXPORT_ID = new Date().toISOString();

function saveEachResponseAsCSV(batchResponse: Array<unknown>) {
	if (batchResponse.length == 0) return;

	const fileWrites = [];

	for (let i = 0; i < batchResponse.length; i++) {
		// @ts-expect-error
		const { response: sqlResponse, subject } = batchResponse[i];
		const csv = convertToCSV(sqlResponse.columns, sqlResponse.rows, {
			except: ["district", "stream"],
		});
		if (sqlResponse.rows.length == 0) {
			continue;
		}

		const file = `./exports-marks-sheet/${EXPORT_ID}/${subject}.csv`;
		fileWrites.push(
			outputFile(file, csv)
				.then(() => console.log("write: ", file))
				.catch(console.error)
		);
	}

	Promise.all(fileWrites).then(() => {
		console.log(`wrote ${fileWrites.length} files totally`);
	});
}

function queryMarksSheetForSubject(subject: Subject) {
	if (!SUBJECTS.includes(subject)) {
		throw new Error(`Unknown subject: ${subject}`);
	}
	return `SELECT
			tbl_students.name,
			marks.*
		FROM final_marks_${subject} AS marks
		JOIN tbl_students
		ON tbl_students.index_no = marks.index_no
		WHERE total IS NOT NULL
		ORDER BY total DESC`;
}

(async () => {
	let totalStatementsRan = 0;
	const statements = SUBJECTS.map(queryMarksSheetForSubject);

	console.log(`trying to run ${statements.length} statements...`);

	const statementsRanMessage = `ran ${statements.length} statements`;
	const batchResponse = await runStatements(
		statements.map((query) => sql.raw(query)),
		statementsRanMessage
	);
	totalStatementsRan += statements.length;

	saveEachResponseAsCSV(
		batchResponse.map((response, i) => {
			return { subject: SUBJECTS[i], response };
		})
	);
})();
