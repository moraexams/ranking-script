import { sql } from "drizzle-orm";

import { convertToCSV, runStatements } from "./helpers";
import { DISTRICTS, District, STREAMS, Stream } from "./types";
import { outputFile } from "fs-extra";
import { table__STUDENTS } from "./constants";

const EXPORT_ID = new Date().toISOString();

function saveEachResponseAsCSV(batchResponse: Array<unknown>) {
	if (batchResponse.length == 0) return;

	const fileWrites = [];

	for (let i = 0; i < batchResponse.length; i++) {
		// @ts-expect-error
		const { response: sqlResponse } = batchResponse[i];
		const csv = convertToCSV(sqlResponse.columns, sqlResponse.rows);
		if (sqlResponse.rows.length == 0) {
			continue;
		}
		const district = sqlResponse.rows[0].district_ranking;
		const stream = sqlResponse.rows[0].stream;

		const file = `./exports/students-details-district-and-stream-wise/${EXPORT_ID}/${district}/${stream}.csv`;
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

function queryStudentsFromDistrictAndStream(district: District, stream: Stream) {
	if (!DISTRICTS.includes(district)) {
		throw new Error(`Unknown district: ${district}`);
	}
	if (!STREAMS.includes(stream)) {
		throw new Error(`Unknown stream: ${stream}`);
	}
	
		// 	t.district as 'district_sitting',
		// JOIN (SELECT DISTINCT district_id, district FROM ${table_EXAM_DISTRICTS}) as t
		// ON students.district_id_sitting = t.district_id
	return `SELECT
			index_no,
			name,
			school,
			email,
			district_ranking,
			subject_group_id as "stream",
			students.telephone
		FROM ${table__STUDENTS} as students
		WHERE subject_group_id = '${stream}' AND district_ranking = '${district}'`
}

(async () => {
	let totalStatementsRan = 0;
	const statements = new Array(DISTRICTS.length * STREAMS.length);
	
	for (let i = 0; i < DISTRICTS.length; i++) {
		for (let j = 0; j < STREAMS.length; j++) {
			statements[i * STREAMS.length + j] = queryStudentsFromDistrictAndStream(DISTRICTS[i], STREAMS[j]);
		}
	}

	console.log(`trying to run ${statements.length} statements...`);

	const statementsRanMessage = `ran ${statements.length} statements`;
	const batchResponse = await runStatements(
		statements.map((query) => sql.raw(query)),
		statementsRanMessage
	);
	totalStatementsRan += statements.length;

	saveEachResponseAsCSV(
		batchResponse.map((response, i) => {
			return { response };
		})
	);
})();
