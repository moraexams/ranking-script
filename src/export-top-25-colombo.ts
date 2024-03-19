import { outputFile } from "fs-extra";
import { sql } from "drizzle-orm";
import { convertToCSV, runStatements } from "./helpers";
import { Stream } from "./types";
import { exportFilename } from "./constants";

function filterStreamResults(stream: Stream) {
	return `
  SELECT
    tbl_final_results.index_no,
    tbl_students.name,
    tbl_students.medium,
    tbl_students.subject_group_id AS 'stream',
    tbl_final_results.district_rank,
    tbl_final_results.island_rank
  FROM tbl_final_results
  JOIN tbl_students
  ON tbl_students.index_no = tbl_final_results.index_no
  WHERE tbl_final_results.district_rank <= 25 AND tbl_students.district_id_ranking = 5 AND tbl_students.subject_group_id = '${stream}'
  ORDER BY tbl_students.subject_group_id, tbl_final_results.district_rank`;
}

const STREAMS_TO_EXPORT: Array<Stream> = ["MATHS", "BIO"];
const statements = new Array(STREAMS_TO_EXPORT.length);

for (let s = 0; s < STREAMS_TO_EXPORT.length; s++) {
	statements[s] = filterStreamResults(STREAMS_TO_EXPORT[s]);
}
let totalStatementsRan = 0;

function saveEachResponseAsCSV(batchResponse: Array<unknown>) {
	if (batchResponse.length == 0) return;

	const fileWrites = [];

	for (let i = 0; i < batchResponse.length; i++) {
		const responseItem = batchResponse[i];
		// @ts-expect-error
		const sqlResponse = responseItem.response;
		const csv = convertToCSV(sqlResponse.columns, sqlResponse.rows);
		if (sqlResponse.rows.length == 0) {
			continue;
		}
		const stream = sqlResponse.rows[0].stream;
		if (typeof stream != "string") {
			throw new Error(`stream is not a string (${stream})`);
		}

		const file = exportFilename(`${stream}.csv`, "top-25-colombo");
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

(async () => {
	console.log(`trying to run ${statements.length} statements...`);

	const statementsRanMessage = `ran ${statements.length} statements`;
	const batchResponse = await runStatements(
		statements.map((query) => sql.raw(query)),
		statementsRanMessage
	);
	totalStatementsRan += statements.length;

	console.log("BATCH", batchResponse.length);
	saveEachResponseAsCSV(
		batchResponse.map((response, i) => {
			return { query: statements[i], response };
		})
	);

	// writeOutput(batchResponse);
	// console.log(`Ran ${totalStatementsRan} statements`);
})();
