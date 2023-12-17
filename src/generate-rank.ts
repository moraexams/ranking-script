import { sql } from "drizzle-orm";
import { db } from "./db";
import {
	view__SUBJECT_FINAL_MARKS,
	view__Z_SCORE_FOR_SUBJECT,
	view__Z_SCORE_FINAL,
	view__FINAL_MARKS,
	view__STREAM_RANKING,
} from "./constants";
import {
	calculateFinalMarksForAll,
	calculateZScoreForSubject,
	dropViewIfExists,
	finalizeZScoreForStream,
	rankForStream,
	separateSubjectMarksIntoView,
	writeOutput,
} from "./helpers";

// WHERE subject1_total IS NOT NULL AND subject2_total IS NOT NULL AND subject3_total IS NOT NULL

let totalStatementsRan = 0;

async function dropAllViews() {
	const statements = [
		dropViewIfExists(view__FINAL_MARKS),
		dropViewIfExists(view__SUBJECT_FINAL_MARKS("bio")),
		dropViewIfExists(view__SUBJECT_FINAL_MARKS("maths")),
		dropViewIfExists(view__SUBJECT_FINAL_MARKS("physics")),
		dropViewIfExists(view__SUBJECT_FINAL_MARKS("chemistry")),
		dropViewIfExists(view__SUBJECT_FINAL_MARKS("ict")),
		dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("bio")),
		dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("maths")),
		dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("physics")),
		dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("chemistry")),
		dropViewIfExists(view__Z_SCORE_FOR_SUBJECT("ict")),
		dropViewIfExists(view__Z_SCORE_FINAL("MATHS")),
		dropViewIfExists(view__Z_SCORE_FINAL("BIO")),
		dropViewIfExists(view__STREAM_RANKING("MATHS")),
		dropViewIfExists(view__STREAM_RANKING("BIO")),
	];
	const DROP_ALL_MESSAGE = `drop all (${statements.length}) views`;

	console.time(DROP_ALL_MESSAGE);
	const batchResponse = await db.batch(
		// @ts-expect-error
		statements.map((statement) => {
			return db.run(statement);
		})
	);
	totalStatementsRan += statements.length;
	console.timeEnd(DROP_ALL_MESSAGE);
	return batchResponse;
}

// These statements are ran in defined order.
const statements = [
	// calculate total marks
	calculateFinalMarksForAll(),
	// separate each subject's marks into views
	separateSubjectMarksIntoView("bio"),
	separateSubjectMarksIntoView("maths"),
	separateSubjectMarksIntoView("physics"),
	separateSubjectMarksIntoView("chemistry"),
	separateSubjectMarksIntoView("ict"),
	// calculate z-score of all students for each subjects
	calculateZScoreForSubject("bio"),
	calculateZScoreForSubject("maths"),
	calculateZScoreForSubject("physics"),
	calculateZScoreForSubject("chemistry"),
	calculateZScoreForSubject("ict"),
	// finalize z-score for each stream
	finalizeZScoreForStream("MATHS"),
	finalizeZScoreForStream("BIO"),
	// generate ranks for each stream
	rankForStream("MATHS"),
	rankForStream("BIO"),
	// output ranks and z-score for comparing
	// sql.raw(
	// 	`SELECT
	// 		${view__STREAM_RANKING("MATHS")}.index_no,
	// 		${view__STREAM_RANKING("MATHS")}.island_rank,
	// 		${view__STREAM_RANKING("MATHS")}.district_rank,
	// 		${view__Z_SCORE_FINAL("MATHS")}.zscore,
	// 		${view__FINAL_MARKS}.district_id_ranking
	// 	FROM ${view__STREAM_RANKING("MATHS")}
	// 	JOIN ${view__Z_SCORE_FINAL("MATHS")}
	// 	ON ${view__Z_SCORE_FINAL("MATHS")}.index_no = ${view__STREAM_RANKING(
	// 		"MATHS"
	// 	)}.index_no
	// 	JOIN ${view__FINAL_MARKS}
	// 	ON ${view__FINAL_MARKS}.index_no = ${view__Z_SCORE_FINAL("MATHS")}.index_no
	// 	ORDER BY ${view__STREAM_RANKING("MATHS")}.island_rank`
	// ),
];

(async () => {
	await dropAllViews();
	console.log(`trying to run ${statements.length} statements...`);

	const statementsRanMessage = `ran ${statements.length} statements`;

	console.time(statementsRanMessage);
	const batchResponse = await db.batch(
		// @ts-expect-error
		statements.map((statement) => {
			return db.run(statement);
		})
	);
	totalStatementsRan += statements.length;
	console.timeEnd(statementsRanMessage);
	writeOutput(batchResponse);
	console.log(`Ran ${totalStatementsRan} statements`);
})();
