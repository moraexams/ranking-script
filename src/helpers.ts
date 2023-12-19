import { writeFile } from "fs/promises";

import { sql } from "drizzle-orm";

import {
	view__SUBJECT_FINAL_MARKS,
	view__Z_SCORE_FOR_SUBJECT,
	view__Z_SCORE_FINAL,
	view__STREAM_RANKING,
	table__STUDENTS,
	view__FINAL_MARKS,
} from "./constants";
import { Subject, Stream } from "./types";
import { db } from "./db";

export function dropViewIfExists(name: string) {
	return sql.raw(`DROP VIEW IF EXISTS ${name}`);
}

// Absent ==> NULL

export function calculateFinalMarksForAll() {
	return sql.raw(`CREATE VIEW ${view__FINAL_MARKS} AS
	SELECT
		tbl_marks.index_no,
		CASE 
			WHEN tbl_marks.subject1_part1 IS NULL AND tbl_marks.subject1_part2 IS NULL THEN NULL
			ELSE (COALESCE(tbl_marks.subject1_part1, 0) + COALESCE(tbl_marks.subject1_part2, 0))/2
		END AS subject1_total,
		CASE 
			WHEN tbl_marks.subject2_part1 IS NULL AND tbl_marks.subject2_part2 IS NULL THEN NULL
			ELSE (COALESCE(tbl_marks.subject2_part1, 0) + COALESCE(tbl_marks.subject2_part2, 0))/2
		END AS subject2_total,
		CASE 
			WHEN tbl_marks.subject3_part1 IS NULL AND tbl_marks.subject3_part2 IS NULL THEN NULL
			ELSE (COALESCE(tbl_marks.subject3_part1, 0) + COALESCE(tbl_marks.subject3_part2, 0))/2
		END AS subject3_total
	FROM tbl_marks
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
	subjectMarksColumnName += "_total";

	let whereCondition: string;
	if (subject == "bio") {
		whereCondition =
			"students.subject_group_id = 'BIO' OR students.subject_group_id = 'Agri (BIO)'";
	} else if (subject == "maths") {
		whereCondition =
			"students.subject_group_id = 'MATHS' OR students.subject_group_id = 'ICT (MATHS)'";
	} else if (subject == "physics") {
		whereCondition =
			"students.subject_group_id = 'MATHS' OR students.subject_group_id = 'BIO' OR students.subject_group_id = 'ICT (MATHS)'";
	} else if (subject == "chemistry") {
		whereCondition =
			"students.subject_group_id = 'MATHS' OR students.subject_group_id = 'BIO' OR students.subject_group_id = 'Agri (BIO)'";
	} else if (subject == "ict") {
		whereCondition = `students.subject_group_id = 'ICT (MATHS)' OR students.subject_group_id = 'Other'`;
	} else {
		assertNever(subject);
	}

	return sql.raw(`CREATE VIEW ${view__SUBJECT_FINAL_MARKS(subject)} AS
	SELECT
		students.index_no,
		final_marks.${subjectMarksColumnName} AS total
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

export function calculateZScoreForSubject(subject: Subject) {
	return sql.raw(`
		CREATE VIEW ${view__Z_SCORE_FOR_SUBJECT(subject)} AS
		WITH Percentile AS (
        SELECT
            index_no,
            NTILE(100) OVER (
							ORDER BY total DESC
						) AS percentile_value
        FROM
            ${view__SUBJECT_FINAL_MARKS(subject)}
				WHERE total IS NOT NULL
		)
		SELECT
				t.index_no,
				(
					(t.total - avg_total.avg_total) / avg_total.stdev_total
				) as zscore,
				t.index_no,
				CASE
					WHEN p.percentile_value <= 40 THEN "W"
					WHEN p.percentile_value <= 55 THEN "S"
					WHEN p.percentile_value <= 65 THEN "C"
					WHEN p.percentile_value <= 75 THEN "B"
					ELSE "A"
				END AS result,
				p.percentile_value
		FROM
				${view__SUBJECT_FINAL_MARKS(subject)} AS t
		JOIN
				(SELECT AVG(total) AS avg_total, 
								SQRT(AVG(total * total) - AVG(total) * AVG(total)) AS stdev_total
				FROM ${view__SUBJECT_FINAL_MARKS(subject)}) AS avg_total ON 1=1
		JOIN Percentile as p
		ON t.index_no = p.index_no
		`);
	// return sql.raw(`CREATE VIEW ${view__zScoreForSubject(subject)} AS
	// SELECT
	// 	t.index_no,
	//   ((t.total - AVG(t.total) OVER()) / (SELECT SQRT(AVG(t.total*t.total) - AVG(t.total)*AVG(t.total)) FROM final_marks_${subject}) OVER()) AS zscore
	// FROM final_marks_${subject} AS t`);
}

export function finalizeZScoreForStream(stream: Stream) {
	let subject1_zscore_view,
		subject2_zscore_view,
		subject3_zscore_view,
		subject_group_id: string;

	if (stream == "MATHS") {
		subject_group_id = stream;
		subject1_zscore_view = view__Z_SCORE_FOR_SUBJECT("maths");
		subject2_zscore_view = view__Z_SCORE_FOR_SUBJECT("physics");
		subject3_zscore_view = view__Z_SCORE_FOR_SUBJECT("chemistry");
	} else if (stream == "BIO") {
		subject_group_id = stream;
		subject1_zscore_view = view__Z_SCORE_FOR_SUBJECT("bio");
		subject2_zscore_view = view__Z_SCORE_FOR_SUBJECT("physics");
		subject3_zscore_view = view__Z_SCORE_FOR_SUBJECT("chemistry");
	} else {
		console.log("unknown stream: ", stream);
		process.exit(2);
	}

	if (subject_group_id == undefined) {
		throw new Error("subject_group_id is not set");
	} else if (subject1_zscore_view == undefined) {
		throw new Error("subject1_zscore_view is not set");
	} else if (subject2_zscore_view == undefined) {
		throw new Error("subject2_zscore_view is not set");
	} else if (subject3_zscore_view == undefined) {
		throw new Error("subject3_zscore_view is not set");
	}

	return sql.raw(`CREATE VIEW ${view__Z_SCORE_FINAL(stream)} AS
		SELECT
			student.index_no,
			(
				(
					subject1_zscore.zscore +
					subject2_zscore.zscore +
					subject3_zscore.zscore
				) / 3
			) AS zscore
		FROM
			${table__STUDENTS} AS student
		JOIN ${subject1_zscore_view} AS subject1_zscore
			ON subject1_zscore.index_no = student.index_no
		JOIN ${subject2_zscore_view} AS subject2_zscore
			ON subject2_zscore.index_no = student.index_no
		JOIN ${subject3_zscore_view} AS subject3_zscore
			ON subject3_zscore.index_no = student.index_no
		WHERE student.subject_group_id='${subject_group_id}'
		`);
}

export function rankForStream(stream: Stream) {
	return sql.raw(`CREATE VIEW ${view__STREAM_RANKING(stream)} AS
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
