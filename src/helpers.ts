import { writeFile } from "fs/promises";

import { sql } from "drizzle-orm";

import {
	view__SUBJECT_FINAL_MARKS,
	view__Z_SCORE_FOR_SUBJECT,
	view__Z_SCORE_FINAL,
	view__STREAM_RANKING,
	table__STUDENTS,
	view__FINAL_MARKS,
	SUBJECT_RESULTS_DISTRICTION_PERCENTILES,
	SUBJECT_RESULTS_DISTRIB_MARKS,
	view__FINAL_RESULTS,
	table__MARKS,
	STREAMS_AND_SUBJECTS,
	table__FINAL_RESULTS,
	table_EXAM_DISTRICTS,
} from "./constants";
import { Subject, Stream } from "./types";
import { db } from "./db";

export function dropViewIfExists(name: string) {
	return sql.raw(`DROP VIEW IF EXISTS '${name}'`);
}
export function dropTableIfExists(name: string) {
	return sql.raw(`DROP TABLE IF EXISTS '${name}'`);
}

// Absent ==> NULL

export function calculateFinalMarksForAll() {
	return sql.raw(`CREATE VIEW ${view__FINAL_MARKS} AS
		SELECT
			students.index_no,
			NULL AS subject1_total,
			NULL AS subject2_total,
			NULL AS subject3_total,
			NULL AS subject1_part1,
			NULL AS subject1_part2,
			NULL AS subject2_part1,
			NULL AS subject2_part2,
			NULL AS subject3_part1,
			NULL AS subject3_part2
		FROM ${table__STUDENTS} AS students
		EXCEPT
		SELECT
			students.index_no,
			NULL AS subject1_total,
			NULL AS subject2_total,
			NULL AS subject3_total,
			NULL AS subject1_part1,
			NULL AS subject1_part2,
			NULL AS subject2_part1,
			NULL AS subject2_part2,
			NULL AS subject3_part1,
			NULL AS subject3_part2
		FROM ${table__MARKS} AS students
		UNION
	SELECT
		marks.index_no,
		CASE 
			WHEN marks.subject1_part1 IS NULL AND marks.subject1_part2 IS NULL THEN NULL
			ELSE (COALESCE(marks.subject1_part1, 0) + COALESCE(marks.subject1_part2, 0))/2
		END AS subject1_total,
		CASE 
			WHEN marks.subject2_part1 IS NULL AND marks.subject2_part2 IS NULL THEN NULL
			ELSE (COALESCE(marks.subject2_part1, 0) + COALESCE(marks.subject2_part2, 0))/2
		END AS subject2_total,
		CASE 
			WHEN marks.subject3_part1 IS NULL AND marks.subject3_part2 IS NULL THEN NULL
			ELSE (COALESCE(marks.subject3_part1, 0) + COALESCE(marks.subject3_part2, 0))/2
		END AS subject3_total,
		marks.subject1_part1,
		marks.subject1_part2,
		marks.subject2_part1,
		marks.subject2_part2,
		marks.subject3_part1,
		marks.subject3_part2
	FROM ${table__MARKS} AS marks
	`);
}

export function separateSubjectMarksIntoView(subject: Subject) {
	console.log("seperate subject marks into view", subject);
	let subjectMarksColumnName: string;
	if (subject == "maths" || subject == "bio") {
		subjectMarksColumnName = "subject1";
	} else if (subject == "physics") {
		subjectMarksColumnName = "subject2";
	} else if (subject == "chemistry" || subject == "ict") {
		subjectMarksColumnName = "subject3";
	} else {
		console.log("ERROR: Unknown subject:", subject);
		process.exit(0);
	}

	let whereCondition: string;
	if (subject == "bio") {
		whereCondition =
			"students.subject_group_id IN ('BIO', 'Agri (BIO)', 'BIO_CHEMISTRY_ICT', 'BIO_PHYSICS_ICT')";
	} else if (subject == "maths") {
		whereCondition = "students.subject_group_id IN ('MATHS', 'ICT (MATHS)')";
	} else if (subject == "physics") {
		whereCondition =
			"students.subject_group_id IN ('MATHS', 'BIO', 'ICT (MATHS)', 'BIO_PHYSICS_ICT')";
	} else if (subject == "chemistry") {
		whereCondition =
			"students.subject_group_id IN ('MATHS', 'BIO', 'Agri (BIO)', 'BIO_CHEMISTRY_ICT')";
	} else if (subject == "ict") {
		whereCondition = `students.subject_group_id IN ('ICT (MATHS)', 'Other', 'ICT ONLY', 'BIO_PHYSICS_ICT')`;
	} else {
		assertNever(subject);
	}

	return sql.raw(`CREATE VIEW ${view__SUBJECT_FINAL_MARKS(subject)} AS
	SELECT
		students.index_no,
		final_marks.${subjectMarksColumnName}_part1 AS part1,
		final_marks.${subjectMarksColumnName}_part2 AS part2,
		final_marks.${subjectMarksColumnName}_total AS total
	FROM ${view__FINAL_MARKS} AS final_marks
	JOIN ${table__STUDENTS} AS students
	ON final_marks.index_no = students.index_no
	WHERE ${whereCondition}`);

	// return sql.raw(`CREATE VIEW ${view__subjectFinalMarks(subject)} AS
	// SELECT
	// 	tbl_students.index_no,
	// 	((tbl_marks.${subjectMarksColumnBaseName}_part1 + tbl_marks.${subjectMarksColumnBaseName}_part2)/2) AS total
	// FROM tbl_marks
	// JOIN tbl_students
	// ON tbl_marks.index_no = tbl_students.index_no
	// WHERE total IS NOT NULL`);
}

// export function calculateZScoreForSubject(subject: Subject) {
//   const resultMaximumPercentiles =
//     SUBJECT_RESULTS_DISTRICTION_PERCENTILES[subject];

//   return sql.raw(`
// 		CREATE VIEW ${view__Z_SCORE_FOR_SUBJECT(subject)} AS
// 		WITH Percentile AS (
//         SELECT
//             index_no,
//             NTILE(100) OVER (
// 							ORDER BY total DESC
// 						) AS percentile_value
//         FROM
//             ${view__SUBJECT_FINAL_MARKS(subject)}
// 				WHERE
// 						total IS NOT NULL
// 				UNION
// 				SELECT
//             index_no,
// 						NULL AS percentile_value
//         FROM
//             ${view__SUBJECT_FINAL_MARKS(subject)}
// 				WHERE total IS NULL
// 		)
// 		SELECT
// 				t.index_no,
// 				(
// 					(t.total - avg_total.avg_total) / avg_total.stdev_total
// 				) as zscore,
// 				CASE
// 					WHEN p.percentile_value <= ${resultMaximumPercentiles["A"]} THEN "A"
// 					WHEN p.percentile_value <= ${resultMaximumPercentiles["B"]} THEN "B"
// 					WHEN p.percentile_value <= ${resultMaximumPercentiles["C"]} THEN "C"
// 					WHEN p.percentile_value <= ${resultMaximumPercentiles["S"]} THEN "S"
// 					WHEN p.percentile_value <= ${resultMaximumPercentiles["W"]} THEN "W"
// 					ELSE "AB"
// 				END AS result
// 		FROM
// 				${view__SUBJECT_FINAL_MARKS(subject)} AS t
// 		JOIN
// 				(SELECT AVG(total) AS avg_total,
// 								SQRT(AVG(total * total) - AVG(total) * AVG(total)) AS stdev_total
// 				FROM ${view__SUBJECT_FINAL_MARKS(subject)}) AS avg_total ON 1=1
// 		JOIN Percentile as p
// 		ON t.index_no = p.index_no
// 		`);
//   // return sql.raw(`CREATE VIEW ${view__zScoreForSubject(subject)} AS
//   // SELECT
//   // 	t.index_no,
//   //   ((t.total - AVG(t.total) OVER()) / (SELECT SQRT(AVG(t.total*t.total) - AVG(t.total)*AVG(t.total)) FROM final_marks_${subject}) OVER()) AS zscore
//   // FROM final_marks_${subject} AS t`);
// }

// zscore calculation using marks boundaries
export function calculateZScoreForSubject(subject: Subject) {
	const resultMaximumPercentiles =
		SUBJECT_RESULTS_DISTRICTION_PERCENTILES[subject];
	const resultMinMarks = SUBJECT_RESULTS_DISTRIB_MARKS[subject];

	return sql.raw(`
		CREATE VIEW ${view__Z_SCORE_FOR_SUBJECT(subject)} AS
		WITH Mark AS (
		       SELECT
		           index_no,
		           total
		       FROM
		           ${view__SUBJECT_FINAL_MARKS(subject)}
					WHERE
							total IS NOT NULL
					UNION
					SELECT
		                index_no,
						NULL AS total
		       		FROM
		           		${view__SUBJECT_FINAL_MARKS(subject)}
					WHERE total IS NULL
			)
		SELECT
				t.index_no,
				(
					(t.total - avg_total.avg_total) / avg_total.stdev_total
				) as zscore,
				CASE
				WHEN t.total >= ${resultMinMarks["A"]} THEN "A"
				WHEN t.total >= ${resultMinMarks["B"]} THEN "B"
				WHEN t.total >= ${resultMinMarks["C"]} THEN "C"
				WHEN t.total >= ${resultMinMarks["S"]} THEN "S"
					WHEN t.total >= ${resultMinMarks["W"]} THEN "W"
					ELSE "AB"
				END AS result
		FROM
				${view__SUBJECT_FINAL_MARKS(subject)} AS t
		JOIN
				(SELECT AVG(total) AS avg_total, 
								SQRT(AVG(total * total) - AVG(total) * AVG(total)) AS stdev_total
				FROM ${view__SUBJECT_FINAL_MARKS(subject)}) AS avg_total ON 1=1
		JOIN Mark as m
		ON t.index_no = m.index_no
		`);
	// return sql.raw(`CREATE VIEW ${view__zScoreForSubject(subject)} AS
	// SELECT
	// 	t.index_no,
	//   ((t.total - AVG(t.total) OVER()) / (SELECT SQRT(AVG(t.total*t.total) - AVG(t.total)*AVG(t.total)) FROM final_marks_${subject}) OVER()) AS zscore
	// FROM final_marks_${subject} AS t`);
}

function formatSubject(subject: Subject) {
	switch (subject) {
		case "bio":
			return "Biology";
		case "chemistry":
			return "Chemistry";
		case "ict":
			return "ICT";
		case "maths":
			return "Combined Mathematics";
		case "physics":
			return "Physics";
		default:
			return subject;
	}
}

export function finalizeZScoreForStream(stream: Stream) {
	let subject1 = STREAMS_AND_SUBJECTS[stream].subject1,
		subject2 = STREAMS_AND_SUBJECTS[stream].subject2,
		subject3 = STREAMS_AND_SUBJECTS[stream].subject3;

	if (stream == "ICT ONLY" && subject3 != undefined) {
		if (subject3 == undefined) {
			throw new Error(`subject3 is undefined (stream=${stream})`);
		}
		return sql.raw(`CREATE VIEW '${view__Z_SCORE_FINAL(stream)}' AS
		SELECT
			student.index_no,
			subject3_zscore.zscore,
			NULL AS subject1,
			NULL AS subject1_result,
			NULL AS subject2,
			NULL AS subject2_result,
			'${formatSubject(subject3)}' AS subject3,
			subject3_zscore.result AS subject3_result
		FROM
			${table__STUDENTS} AS student
		JOIN ${view__Z_SCORE_FOR_SUBJECT("ict")} AS subject3_zscore
			ON subject3_zscore.index_no = student.index_no
		WHERE student.subject_group_id='${stream}'
		`);
	}

	if (stream == "Agri (BIO)") {
		if (subject1 == undefined || subject3 == undefined) {
			throw new Error(
				`subject1 (${subject1}) or subject3 (${subject3}) is undefined (stream=${stream})`
			);
		}
		return sql.raw(`CREATE VIEW '${view__Z_SCORE_FINAL(stream)}' AS
		SELECT
			student.index_no,
			(
				(
					subject1_zscore.zscore +
					subject3_zscore.zscore
				) / 2
			) AS zscore,
			"${formatSubject(subject1)}" AS subject1,
			subject1_zscore.result AS subject1_result,
			NULL AS subject2,
			NULL AS subject2_result,
			"${formatSubject(subject3)}" AS subject3,
			subject3_zscore.result AS subject3_result
		FROM
			${table__STUDENTS} AS student
		JOIN ${view__Z_SCORE_FOR_SUBJECT("bio")} AS subject1_zscore
			ON subject1_zscore.index_no = student.index_no
		JOIN ${view__Z_SCORE_FOR_SUBJECT("chemistry")} AS subject3_zscore
			ON subject3_zscore.index_no = student.index_no
		WHERE student.subject_group_id='${stream}'
		`);
	}

	if (stream == "BIO_CHEMISTRY_ICT") {
		if (subject1 == undefined || subject3 == undefined) {
			throw new Error(
				`subject1 (${subject1}) or subject3 (${subject3}) is undefined (stream=${stream})`
			);
		}
		return sql.raw(`CREATE VIEW ${view__Z_SCORE_FINAL(stream)} AS
		SELECT
			student.index_no,
			(
				(
					subject1_zscore.zscore +
					subject3_zscore.zscore
				) / 2
			) AS zscore,
			"${formatSubject(subject1)}" AS subject1,
			subject1_zscore.result AS subject1_result,
			NULL AS subject2,
			NULL AS subject2_result,
			"${formatSubject(subject3)}" AS subject3,
			subject3_zscore.result AS subject3_result
		FROM
			${table__STUDENTS} AS student
		JOIN ${
			// @ts-expect-error
			view__Z_SCORE_FOR_SUBJECT(STREAMS_AND_SUBJECTS[stream].subject1)
		} AS subject1_zscore
		ON subject1_zscore.index_no = student.index_no
		JOIN ${
			// @ts-expect-error
			view__Z_SCORE_FOR_SUBJECT(STREAMS_AND_SUBJECTS[stream].subject3)
		} AS subject3_zscore
			ON subject3_zscore.index_no = student.index_no
		WHERE student.subject_group_id='${stream}'
		`);
	}

	if (subject1 == undefined || subject2 == undefined || subject3 == undefined) {
		console.log("subject1 or subject2 or subject3 is undefined for", stream);
		process.exit(3);
	}

	const subject1_zscore_view = view__Z_SCORE_FOR_SUBJECT(subject1),
		subject2_zscore_view = view__Z_SCORE_FOR_SUBJECT(subject2),
		subject3_zscore_view = view__Z_SCORE_FOR_SUBJECT(subject3);

	return sql.raw(`CREATE VIEW ${view__Z_SCORE_FINAL(stream)} AS
		SELECT
			student.index_no,
			(
				(
					subject1_zscore.zscore +
					subject2_zscore.zscore +
					subject3_zscore.zscore
				) / 3
			) AS zscore,
			"${formatSubject(subject1)}" AS subject1,
			subject1_zscore.result AS subject1_result,
			"${formatSubject(subject2)}" AS subject2,
			subject2_zscore.result AS subject2_result,
			"${formatSubject(subject3)}" AS subject3,
			subject3_zscore.result AS subject3_result
		FROM
			${table__STUDENTS} AS student
		JOIN ${subject1_zscore_view} AS subject1_zscore
			ON subject1_zscore.index_no = student.index_no
		JOIN ${subject2_zscore_view} AS subject2_zscore
			ON subject2_zscore.index_no = student.index_no
		JOIN ${subject3_zscore_view} AS subject3_zscore
			ON subject3_zscore.index_no = student.index_no
		WHERE student.subject_group_id='${stream}'
		`);
}

export function rankForStream(stream: Stream) {
	if (
		stream == "Agri (BIO)" ||
		stream == "BIO_CHEMISTRY_ICT" ||
		stream == "BIO_PHYSICS_ICT" ||
		stream == "ICT ONLY"
	) {
		return sql.raw(`CREATE VIEW '${view__STREAM_RANKING(stream)}' AS
			SELECT
				t.index_no,
				"-" AS island_rank,
				"-" AS district_rank
			FROM ${table__STUDENTS} as student
			JOIN ${view__Z_SCORE_FINAL(stream)} as t
			ON student.index_no = t.index_no
		`);
	}
	return sql.raw(`CREATE VIEW '${view__STREAM_RANKING(stream)}' AS
	SELECT
		t.index_no,
		"-" AS island_rank,
		"-" AS district_rank
	FROM ${table__STUDENTS} as student
	JOIN ${view__Z_SCORE_FINAL(stream)} as t
	ON student.index_no = t.index_no
	WHERE t.zscore IS NULL
	UNION
	SELECT
		t.index_no,
		RANK() OVER (
			ORDER BY t.zscore DESC
		) island_rank,
		RANK() OVER (
			PARTITION BY student.district_id_ranking
			ORDER BY t.zscore DESC
		) district_rank
	FROM ${table__STUDENTS} as student
	JOIN ${view__Z_SCORE_FINAL(stream)} as t
	ON student.index_no = t.index_no
	WHERE t.zscore IS NOT NULL
	`);
}

function $finalizeStreamResults(stream: Stream) {
	const x = `SELECT
		stream_final.*,
		ranking.island_rank,
		ranking.district_rank
	FROM ${view__Z_SCORE_FINAL(stream)} AS stream_final
	JOIN ${view__STREAM_RANKING(stream)} AS ranking
	ON ranking.index_no = stream_final.index_no
	`;
	console.log(x);
	return x;
}

export function finalizeResults() {
	return sql.raw(`CREATE TABLE '${table__FINAL_RESULTS}' AS
		${$finalizeStreamResults("Agri (BIO)")}
		UNION
		${$finalizeStreamResults("BIO")}
		UNION
		${$finalizeStreamResults("BIO_CHEMISTRY_ICT")}
		UNION
		${$finalizeStreamResults("BIO_PHYSICS_ICT")}
		UNION
		${$finalizeStreamResults("ICT (MATHS)")}
		UNION
		${$finalizeStreamResults("ICT ONLY")}
		UNION
${$finalizeStreamResults("MATHS")}
	`);
}

export function writeOutput(json: unknown) {
	const timestamp = new Date().toISOString();
	let name = `./logs/output-${timestamp}.json`;
	return writeFile(name, JSON.stringify(json, null, 2));
}

function assertNever(subject: never): never {
	throw new Error(`${subject} is expected to be type:never`);
}

export async function runStatements(
	statements: Array<unknown>,
	message?: string
) {
	if (message) {
		console.time(message);
	}
	const batchResponse = await db.batch(
		// @ts-expect-error
		statements.map((statement) => {
			// @ts-expect-error
			return db.run(statement);
		})
	);
	if (message) {
		console.timeEnd(message);
	}

	return batchResponse;
}

export function convertToCSV(
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
