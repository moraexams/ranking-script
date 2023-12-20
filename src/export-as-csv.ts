import { outputFile } from "fs-extra";
import { sql } from "drizzle-orm";
import { runStatements } from "./helpers";
import {
	table_EXAM_DISTRICTS,
	table__EXAM_CENTRES,
	table__STUDENTS,
	view__SUBJECT_FINAL_MARKS,
} from "./constants";
import { ExamPart, Subject } from "./types";

function extractArgument<T = unknown>(
	name: "--subject" | "--part",
	allowedValues: Array<T> | undefined = undefined
): T {
	const index = process.argv.indexOf(name) + 1;
	const value = process.argv[index] as T | undefined;
	if (index == 0 || value == undefined) {
		console.log(`${name} is not provided`);
		process.exit(1);
	}

	if (allowedValues != undefined && !allowedValues.includes(value as T)) {
		console.log(`${name} is not a recognized value (${process.argv[index]})`);
		process.exit(1);
	}

	return value;
}

const SUBJECT = extractArgument("--subject", [
	"bio",
	"chemistry",
	"ict",
	"maths",
	"physics",
] as Array<Subject>);

const PART = extractArgument("--part", ["part1", "part2"] as Array<ExamPart>);

console.log(
	[
		`==================`,
		`EXPORTING...`,
		`     SUBJECT=${SUBJECT}`,
		`     PART=${PART}`,
		`==================`,
	].join("\n")
);

function filterStudentsMarks(
	subject: Subject,
	examCentreId: number,
	part: "part1" | "part2"
) {
	return {
		subject,
		part,
		examCentreId,
		sqlQuery: `
		SELECT
			students.index_no,
			subject_marks.${part},
			exam_centres.centre_name,
			exam_districts.district
		FROM ${table__STUDENTS} AS students
		JOIN ${view__SUBJECT_FINAL_MARKS(subject)} AS subject_marks
		ON students.index_no = subject_marks.index_no
		JOIN ${table__EXAM_CENTRES} AS exam_centres
		ON exam_centres.centre_id = students.centre_id
		JOIN ${table_EXAM_DISTRICTS} AS exam_districts
		ON exam_centres.district_id = exam_districts.district_id
		WHERE students.centre_id = ${examCentreId}
	`,
	};
}

function numbersFromTo(from: number, to: number) {
	const length = to - from + 1;
	const arr = new Array(length);
	for (let i = 0; i < length; i++) {
		arr[i] = from + i;
	}

	return arr;
}

const examCentreIdArr = numbersFromTo(1, 69);

const statements = examCentreIdArr.map((centreId) => {
	return filterStudentsMarks(SUBJECT, centreId, PART);
});
let totalStatementsRan = 0;

function convertToCSV(columns: Array<string>, rows: Array<Array<unknown>>) {
	return columns.join(",").concat(
		"\n",
		rows
			.map((row) => {
				return Array.from(row).join(",");
			})
			.join("\n")
	);
}

function _centreName(centreName: string) {
	let s = "";
	centreName = centreName.trim();
	for (let i = 0; i < centreName.length; i++) {
		let char = centreName.charAt(i);
		if (char == " " || char == "/" || char == ",") {
			s += "_";
		} else {
			s += char.toLowerCase();
		}
	}
	console.log("_centreName", s);
	return s;
}

function saveEachResponseAsCSV(batchResponse: Array<unknown>) {
	if (batchResponse.length == 0) return;
	const timestamp = new Date().toISOString();

	const fileWrites = [];
	for (let i = 0; i < batchResponse.length; i++) {
		const responseItem = batchResponse[i];
		// @ts-expect-error
		const sqlResponse = responseItem.response;
		const csv = convertToCSV(sqlResponse.columns, sqlResponse.rows);
		if (sqlResponse.rows.length == 0) {
			continue;
		}
		const centreName = _centreName(sqlResponse.rows[0].centre_name);
		const district = (
			sqlResponse.rows[0].district as string | "unknown_district"
		).toLowerCase();

		const file = `./exports/${timestamp}/marks-${SUBJECT}-${PART}/${district}/${centreName}.csv`;
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
		statements.map((s) => sql.raw(s.sqlQuery)),
		statementsRanMessage
	);
	totalStatementsRan += statements.length;

	console.log("BATCH", batchResponse.length);
	saveEachResponseAsCSV(
		batchResponse.map((response, i) => {
			return { ...statements[i], response };
		})
	);

	// writeOutput(batchResponse);
	// console.log(`Ran ${totalStatementsRan} statements`);
})();
