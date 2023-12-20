import { outputFile } from "fs-extra";
import { sql } from "drizzle-orm";
import { runStatements } from "./helpers";
import {
	table_EXAM_DISTRICTS,
	table__EXAM_CENTRES,
	table__MARKS,
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

function filterStudentsMarks(subject: Subject, part: "part1" | "part2") {
	return `SELECT
			students.index_no,
			subject_marks.${part}
		FROM ${table__STUDENTS} AS students
		JOIN ${view__SUBJECT_FINAL_MARKS(subject)} AS subject_marks
		ON students.index_no = subject_marks.index_no
		WHERE subject_marks.${part} > 0 AND subject_marks.${part} < 100
		ORDER BY subject_marks.${part} DESC`;
}

function filterStudentsMarksByExamCentreId(
	subject: Subject,
	part: "part1" | "part2",
	examCentreId: number
) {
	let subjectNumber: number;
	if (subject == "bio" || subject == "maths") {
		subjectNumber = 1;
	} else if (subject == "physics") {
		subjectNumber = 2;
	} else if (subject == "chemistry" || subject == "ict") {
		subjectNumber = 3;
	} else {
		throw new Error("Unknown subject:", subject);
	}

	return `
		SELECT
			DISTINCT
			students.index_no,
			subject_marks.${part},
			exam_centres.centre_name,
			exam_districts.district,
			marks.sub${subjectNumber}_p${PART.replace("part", "")}_datetime AS entered_on
		FROM ${table__STUDENTS} AS students
		JOIN ${view__SUBJECT_FINAL_MARKS(subject)} AS subject_marks
		ON students.index_no = subject_marks.index_no
		JOIN ${table__EXAM_CENTRES} AS exam_centres
		ON exam_centres.centre_id = students.centre_id
		JOIN ${table_EXAM_DISTRICTS} AS exam_districts
		ON exam_centres.district_id = exam_districts.district_id
		JOIN ${table__MARKS} AS marks
		ON marks.index_no = students.index_no
		WHERE students.centre_id = ${examCentreId}
		ORDER BY marks.sub${subjectNumber}_p${PART.replace("part", "")}_datetime
	`;
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

const statements = [filterStudentsMarks(SUBJECT, PART)].concat(
	examCentreIdArr.map((centreId) => {
		return filterStudentsMarksByExamCentreId(SUBJECT, PART, centreId);
	})
);
let totalStatementsRan = 0;

function convertToCSV(
	columns: Array<string>,
	rows: Array<Array<unknown>>,
	options?: {
		except?: Array<string>;
	}
) {
	if (options == undefined) {
		options = {};
	}
	if (options.except == undefined) {
		options.except = [];
	}

	const removeIndexes: Array<number> = [];

	if (options.except.length > 0) {
		for (let i = 0; i < columns.length; i++) {
			const columnName = columns[i];
			if (options.except.includes(columnName)) {
				removeIndexes.push(i);
			}
		}
	}

	return columns
		.filter((_, i) => !removeIndexes.includes(i))
		.join(",")
		.concat(
			"\n",
			rows
				.map((row) => {
					return Array.from(row)
						.filter((_, i) => !removeIndexes.includes(i))
						.join(",");
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

	// @ts-expect-error
	const allMarksResponse = batchResponse[0].response;
	const csv = convertToCSV(allMarksResponse.columns, allMarksResponse.rows);
	if (allMarksResponse.rows.length != 0) {
		const file = `./exports/${timestamp}/marks-${SUBJECT}-${PART}/total.csv`;
		fileWrites.push(
			outputFile(file, csv)
				.then(() => console.log("write: ", file))
				.catch(console.error)
		);
	}

	for (let i = 1; i < batchResponse.length; i++) {
		const responseItem = batchResponse[i];
		// @ts-expect-error
		const sqlResponse = responseItem.response;
		const csv = convertToCSV(sqlResponse.columns, sqlResponse.rows, {
			except: ["centre_name", "district", "entered_on"],
		});
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
