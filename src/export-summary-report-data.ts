import { outputFile } from "fs-extra";
import { sql } from "drizzle-orm";
import { convertToCSV, runStatements } from "./helpers";
import { ResultValue, Subject, SUBJECTS, Medium } from "./types";

let EXPORT_ID = new Date().toISOString();

function filterSubjectResults(subject: Subject) {
	function countTotalStudents() {
		return `(SELECT
				COUNT(*)
			FROM tbl_students
			JOIN zscore_${subject} AS z
			ON tbl_students.index_no = z.index_no
			WHERE z.result <> 'AB'
			) AS 'Total'
			`;
	}
	function countResultsForSubjectInAllDistricts(result: ResultValue) {
		return `(
			SELECT
				COUNT(*)
			FROM tbl_students
			JOIN zscore_${subject} AS z
			ON tbl_students.index_no = z.index_no
			WHERE z.result = '${result}'
		) AS '${result}'`;
	}
	function countMediumTotal(medium: Medium) {
		return `(
			SELECT
				COUNT(*)
			FROM tbl_students
			JOIN zscore_${subject} AS z
			ON tbl_students.index_no = z.index_no
			WHERE tbl_students.medium = '${medium}' AND z.result <> 'AB'
		) AS '${medium}'`;
	}
	function countMediumInEachDistrict(medium: Medium) {
		return `(
			SELECT
				COUNT(*)
			FROM tbl_students
			JOIN zscore_${subject} AS z
			ON tbl_students.index_no = z.index_no
			WHERE tbl_students.medium = '${medium}' AND tbl_students.district_ranking = tbl_exam_districts.district AND z.result <> 'AB'
		) AS '${medium}'`;
	}
	function countResultsForSubjectForEachDistrict(
		result: ResultValue | "total"
	) {
		if (result == "total") {
			return `(
			SELECT
				COUNT(*)
			FROM tbl_students
			JOIN zscore_${subject} AS z
			ON tbl_students.index_no = z.index_no
			WHERE tbl_students.district_ranking = tbl_exam_districts.district AND z.result <> 'AB'
		) AS 'Total'`;
		}
		return `(
			SELECT
				COUNT(*)
			FROM tbl_students
			JOIN zscore_${subject} AS z
			ON tbl_students.index_no = z.index_no
			WHERE z.result = '${result}' AND tbl_students.district_ranking = tbl_exam_districts.district AND z.result <> 'AB'
		) AS '${result}'`;
	}

	return `SELECT
		DISTINCT tbl_exam_districts.district AS 'District',
		${countResultsForSubjectForEachDistrict("A")},
		${countResultsForSubjectForEachDistrict("B")},
		${countResultsForSubjectForEachDistrict("C")},
		${countResultsForSubjectForEachDistrict("S")},
		${countResultsForSubjectForEachDistrict("W")},
		${countResultsForSubjectForEachDistrict("total")},
		'',
		${countMediumInEachDistrict("english")},
		${countMediumInEachDistrict("tamil")},
		'${subject}' AS subject
	FROM tbl_exam_districts
	WHERE tbl_exam_districts.telephone <> 'NO'
	UNION
	SELECT
		'_Grand_Total',
		${countResultsForSubjectInAllDistricts("A")},
		${countResultsForSubjectInAllDistricts("B")},
		${countResultsForSubjectInAllDistricts("C")},
		${countResultsForSubjectInAllDistricts("S")},
		${countResultsForSubjectInAllDistricts("W")},
		${countTotalStudents()},
		'',
		${countMediumTotal("english")},
		${countMediumTotal("tamil")},
		'${subject}' AS subject
	`;
}

const statements = new Array(SUBJECTS.length);
for (let s = 0; s < SUBJECTS.length; s++) {
	statements[s] = filterSubjectResults(SUBJECTS[s]);
}
let totalStatementsRan = 0;

function saveEachResponseAsCSV(batchResponse: Array<unknown>) {
	if (batchResponse.length == 0) return;

	const fileWrites = [];

	for (let i = 0; i < batchResponse.length; i++) {
		const responseItem = batchResponse[i];
		// @ts-expect-error
		const sqlResponse = responseItem.response;
		const csv = convertToCSV(sqlResponse.columns, sqlResponse.rows, {
			except: ["subject"],
		});
		if (sqlResponse.rows.length == 0) {
			continue;
		}
		const subject = sqlResponse.rows[0].subject;

		const file = `./export-summary/${EXPORT_ID}/results/${subject}.csv`;
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
