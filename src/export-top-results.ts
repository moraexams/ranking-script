import { outputFile } from "fs-extra";
import { sql } from "drizzle-orm";
import { convertToCSV, runStatements } from "./helpers";
import { Stream } from "./types";

let EXPORT_ID = new Date().toISOString();

function filterStreamResults(stream: Stream) {
  return `
	SELECT
		tbl_students.name,
		tbl_students.index_no,
		tbl_students.subject_group_id AS stream,
		"subject1"	,
		"subject1_result"	,
		"subject2"	,
		"subject2_result"	,
		"subject3"	,
		"subject3_result"	,
		"island_rank"	,
		tbl_students.district_ranking AS district
	FROM tbl_final_results
	JOIN tbl_students
	ON tbl_students.index_no = tbl_final_results.index_no
	WHERE tbl_students.subject_group_id = "${stream}" AND tbl_final_results.island_rank <= 20
	ORDER BY tbl_final_results.island_rank`;
}

const STREAMS_TO_EXPORT: Array<Stream> = ["MATHS", "BIO", "ICT (MATHS)"];
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

    const file = `./result-exports/${EXPORT_ID}/top-results/${stream}.csv`;
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
