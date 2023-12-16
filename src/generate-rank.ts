import { writeFile } from "fs/promises";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { Subject, SubjectZScoreCalculationValues, Stream } from "./types";
import {
	view__SUBJECT_FINAL_MARKS,
	view__Z_SCORE_FOR_SUBJECT,
	view__Z_SCORE_FINAL,
	view__FINAL_MARKS,
} from "./constants";

const timestamp = new Date().toISOString();

const subjectsZScoreCalculationValues: Record<
	Subject,
	SubjectZScoreCalculationValues
> = {
	bio: {
		average: undefined,
		standardDeviation: undefined,
	},
	physics: {
		average: undefined,
		standardDeviation: undefined,
	},
	maths: {
		average: undefined,
		standardDeviation: undefined,
	},
	ict: {
		average: undefined,
		standardDeviation: undefined,
	},
	chemistry: {
		average: undefined,
		standardDeviation: undefined,
	},
};

function seperateSubjectMarksIntoView(subject: Subject) {
	console.log("seperate subject marks into view", subject);
	let subjectMarksColumnBaseName: string;
	if (subject == "maths" || subject == "bio") {
		subjectMarksColumnBaseName = "subject1";
	} else if (subject == "physics") {
		subjectMarksColumnBaseName = "subject2";
	} else if (subject == "chemistry" || subject == "ict") {
		subjectMarksColumnBaseName = "subject3";
	} else {
		console.log("ERROR: Unknown subject:", subject);
		process.exit(0);
	}

	if (subject == "bio") {
		return sql.raw(`CREATE VIEW ${view__SUBJECT_FINAL_MARKS(subject)} AS
	SELECT
		tbl_students.index_no,
		((tbl_marks.${subjectMarksColumnBaseName}_part1 + tbl_marks.${subjectMarksColumnBaseName}_part2)/2) AS total
	FROM tbl_marks
	JOIN tbl_students
	ON tbl_marks.index_no = tbl_students.index_no
	WHERE total IS NOT NULL AND (tbl_students.subject_group_id = 'BIO' OR tbl_students.subject_group_id = 'Agri (BIO)')`);
	}

	if (subject == "maths") {
		return sql.raw(`CREATE VIEW ${view__SUBJECT_FINAL_MARKS(subject)} AS
	SELECT
		tbl_students.index_no,
		((tbl_marks.${subjectMarksColumnBaseName}_part1 + tbl_marks.${subjectMarksColumnBaseName}_part2)/2) AS total
	FROM tbl_marks
	JOIN tbl_students
	ON tbl_marks.index_no = tbl_students.index_no
	WHERE total IS NOT NULL AND (tbl_students.subject_group_id = 'MATHS' OR tbl_students.subject_group_id = 'ICT (Maths)')`);
	}

	if (subject == "physics") {
		return sql.raw(`CREATE VIEW ${view__SUBJECT_FINAL_MARKS(subject)} AS
	SELECT
		tbl_students.index_no,
		((tbl_marks.${subjectMarksColumnBaseName}_part1 + tbl_marks.${subjectMarksColumnBaseName}_part2)/2) AS total
	FROM tbl_marks
	JOIN tbl_students
	ON tbl_marks.index_no = tbl_students.index_no
	WHERE total IS NOT NULL AND (tbl_students.subject_group_id <> 'Other')`);
	}

	if (subject == "chemistry") {
		return sql.raw(`CREATE VIEW ${view__SUBJECT_FINAL_MARKS(subject)} AS
	SELECT
		tbl_students.index_no,
		((tbl_marks.${subjectMarksColumnBaseName}_part1 + tbl_marks.${subjectMarksColumnBaseName}_part2)/2) AS total
	FROM tbl_marks
	JOIN tbl_students
	ON tbl_marks.index_no = tbl_students.index_no
	WHERE total IS NOT NULL AND (tbl_students.subject_group_id = 'MATHS' OR tbl_students.subject_group_id = 'BIO' OR tbl_students.subject_group_id = 'Agri (BIO)')`);
	}

	if (subject == "ict") {
		return sql.raw(`CREATE VIEW ${view__SUBJECT_FINAL_MARKS(subject)} AS
	SELECT
		tbl_students.index_no,
		((tbl_marks.${subjectMarksColumnBaseName}_part1 + tbl_marks.${subjectMarksColumnBaseName}_part2)/2) AS total
	FROM tbl_marks
	JOIN tbl_students
	ON tbl_marks.index_no = tbl_students.index_no
	WHERE total IS NOT NULL AND (tbl_students.subject_group_id = 'ICT (Maths)' OR tbl_students.subject_group_id = 'Other')`);
	}

	console.error("Unknown subject:", subject);
	process.exit(1);
	// return sql.raw(`CREATE VIEW ${view__subjectFinalMarks(subject)} AS
	// SELECT
	// 	tbl_students.index_no,
	// 	((tbl_marks.${subjectMarksColumnBaseName}_part1 + tbl_marks.${subjectMarksColumnBaseName}_part2)/2) AS total
	// FROM tbl_marks
	// JOIN tbl_students
	// ON tbl_marks.index_no = tbl_students.index_no
	// WHERE total IS NOT NULL`);
}

function calculateZScoreForSubject(subject: Subject) {
	console.log(
		"calculate z-score for subject:",
		subject,
		subjectsZScoreCalculationValues[subject]
	);
	return sql.raw(`
		CREATE VIEW ${view__Z_SCORE_FOR_SUBJECT(subject)} AS
 		SELECT
        t.index_no,
        (
            (t.total - ${subjectsZScoreCalculationValues[subject].average}) / 
							${subjectsZScoreCalculationValues[subject].standardDeviation}
        ) as zscore
    FROM ${view__SUBJECT_FINAL_MARKS(subject)} AS t`);
	// return sql.raw(`CREATE VIEW ${view__zScoreForSubject(subject)} AS
	// SELECT
	// 	t.index_no,
	//   ((t.total - AVG(t.total) OVER()) / (SELECT SQRT(AVG(t.total*t.total) - AVG(t.total)*AVG(t.total)) FROM final_marks_${subject}) OVER()) AS zscore
	// FROM final_marks_${subject} AS t`);
}

function finalizeZScoreForStream(stream: Stream) {
	let subject1_zscore_view, subject2_zscore_view, subject3_zscore_view;

	if (stream == "MATHS" || stream == "BIO") {
		subject2_zscore_view = view__Z_SCORE_FOR_SUBJECT("physics");
		subject3_zscore_view = view__Z_SCORE_FOR_SUBJECT("chemistry");
	}

	if (stream == "MATHS") {
		subject1_zscore_view = view__Z_SCORE_FOR_SUBJECT("maths");
	} else if (stream == "BIO") {
		subject1_zscore_view = view__Z_SCORE_FOR_SUBJECT("bio");
	}

	return sql.raw(`CREATE VIEW ${view__Z_SCORE_FINAL(stream)} AS
		SELECT
			${subject1_zscore_view}.index_no,
			((${subject1_zscore_view}.zscore + ${subject2_zscore_view}.zscore + ${subject3_zscore_view}.zscore)/3)
		AS zscore
		FROM
			${subject1_zscore_view}
		JOIN ${subject2_zscore_view}
			ON ${subject2_zscore_view}.index_no = ${subject1_zscore_view}.index_no
		JOIN ${subject3_zscore_view}
			ON ${subject3_zscore_view}.index_no = ${subject1_zscore_view}.index_no`);
}

function dropViewIfExists(name: string) {
	return sql.raw(`DROP VIEW IF EXISTS ${name}`);
}

// WHERE subject1_total IS NOT NULL AND subject2_total IS NOT NULL AND subject3_total IS NOT NULL
const statements = [
	dropViewIfExists(view__FINAL_MARKS),
	sql.raw(`CREATE VIEW ${view__FINAL_MARKS} AS
	SELECT
		tbl_students.index_no,
		((tbl_marks.subject1_part1 + tbl_marks.subject1_part2)/2) AS subject1_total,
		((tbl_marks.subject2_part1 + tbl_marks.subject2_part2)/2) AS subject2_total,
		((tbl_marks.subject3_part1 + tbl_marks.subject3_part2)/2) AS subject3_total,
		tbl_students.subject_group_id,
		tbl_students.district_id_ranking
	FROM tbl_marks
	JOIN tbl_students
	ON tbl_marks.index_no = tbl_students.index_no`),
	dropViewIfExists(view__SUBJECT_FINAL_MARKS("bio")),
	dropViewIfExists(view__SUBJECT_FINAL_MARKS("maths")),
	dropViewIfExists(view__SUBJECT_FINAL_MARKS("physics")),
	dropViewIfExists(view__SUBJECT_FINAL_MARKS("chemistry")),
	dropViewIfExists(view__SUBJECT_FINAL_MARKS("ict")),
	seperateSubjectMarksIntoView("bio"),
	seperateSubjectMarksIntoView("maths"),
	seperateSubjectMarksIntoView("physics"),
	seperateSubjectMarksIntoView("chemistry"),
	seperateSubjectMarksIntoView("ict"),
];

const statements3 = [
	dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("bio")),
	dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("maths")),
	dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("physics")),
	dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("chemistry")),
	dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("ict")),
	calculateZScoreForSubject.bind(null, "bio"),
	calculateZScoreForSubject.bind(null, "maths"),
	calculateZScoreForSubject.bind(null, "physics"),
	calculateZScoreForSubject.bind(null, "chemistry"),
	calculateZScoreForSubject.bind(null, "ict"),
	dropViewIfExists(view__Z_SCORE_FINAL("MATHS")),
	dropViewIfExists(view__Z_SCORE_FINAL("BIO")),
	finalizeZScoreForStream("MATHS"),
	finalizeZScoreForStream("BIO"),
];

async function findZScoreCalculationValues() {
	const subjects = ["bio", "maths", "ict", "physics", "chemistry"] as const;

	const statements2 = subjects.map((subject) =>
		db.run(
			sql.raw(`SELECT
			AVG(t.total) as average,
			AVG(t.total * t.total) - (AVG(t.total) * AVG(t.total)) as variance
		FROM ${view__SUBJECT_FINAL_MARKS(subject)} AS t`)
		)
	);

	// @ts-expect-error
	const batchResponse2 = await db.batch(statements2);

	for (let i = 0; i < batchResponse2.length; i++) {
		const item = batchResponse2[i];
		const { "0": average, "1": variance } = item.rows[0];
		const _subject = subjects[i];
		console.log(_subject, {
			average,
			variance,
		});

		if (subjectsZScoreCalculationValues[_subject] == undefined) {
			console.log(`subjectsZScoreCalculationValues.${_subject} is undefined`);
			process.exit(1);
		}
		subjectsZScoreCalculationValues[_subject]["average"] = average;
		subjectsZScoreCalculationValues[_subject]["standardDeviation"] =
			Math.sqrt(variance);
	}

	writeOutput(batchResponse2, 2);
}

function writeOutput(json: unknown, id: unknown = undefined) {
	let name = `./logs/output-${timestamp}.json`;
	if (id != undefined) {
		name = `./logs/output-${id}-${timestamp}.json`;
	}
	return writeFile(name, JSON.stringify(json, null, 2));
}

(async () => {
	console.log(`trying to run ${statements.length} statements...`);
	const id = `${statements.length} statements`;

	console.time(id);
	const batchResponse = await db.batch(
		// @ts-expect-error
		statements.map((statement) => {
			return db.run(statement);
		})
	);
	console.timeEnd(id);
	writeOutput(batchResponse, 1);

	await findZScoreCalculationValues();

	const d = await db.run(
		sql.raw(`SELECT
        t.index_no,
        (
            (t.total - ${subjectsZScoreCalculationValues["maths"].average}) / 
							${subjectsZScoreCalculationValues["maths"].standardDeviation}
            
        ) as zscore
    FROM ${view__SUBJECT_FINAL_MARKS("maths")} AS t`)
	);
	console.log(d);

	const batchResponse3 = await db.batch(
		// @ts-expect-error
		statements3.map((statement) => {
			if (typeof statement == "function") {
				return db.run(statement());
			}
			return db.run(statement);
		})
	);
	console.timeEnd(id);
	writeOutput(batchResponse3, 3);
})();
