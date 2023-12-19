import { Subject, Stream, ResultValue } from "./types";

export const view__FINAL_MARKS = "final_marks";

export function view__SUBJECT_FINAL_MARKS(subject: Subject) {
	return `final_marks_${subject}`;
}

export function view__Z_SCORE_FOR_SUBJECT(subject: Subject) {
	return `zscore_${subject}`;
}
export function view__Z_SCORE_FINAL(stream: Stream) {
	return `zscore_final_${stream.toLowerCase()}`;
}
export function view__STREAM_RANKING(stream: Stream) {
	return `stream_ranking_${stream.toLowerCase()}`;
}

export const table__STUDENTS = "tbl_students";
export const table__MARKS = "tbl_marks";

function sumAll(arr: Array<number>) {
	return arr.reduce((accumulated, currentValue) => accumulated + currentValue);
}

function calculatePercentileForW(
	percentilesObj: Record<Subject, Record<Exclude<ResultValue, "W">, number>>
): Record<Subject, Record<ResultValue, number>> {
	const outputEntries = Object.entries(percentilesObj).map(
		([subject, value]) => {
			let sumOfPercentiles = sumAll(Object.values(value));
			if (sumOfPercentiles > 100) {
				throw new Error(
					`sumOfPercentiles for ${subject} has exceed 100 (${sumOfPercentiles})`
				);
			}
			return [subject, { ...value, W: 100 - sumOfPercentiles }] as [
				Subject,
				Record<ResultValue, number>
			];
		}
	);

	// @ts-expect-error
	return Object.fromEntries(outputEntries);
}

/**
 * Defines maximum percentiles for each result (A, B, C, S, W)
 * with respect to each subject
 */
export const SUBJECT_RESULTS_DISTRICTION_PERCENTILES = calculatePercentileForW({
	bio: {
		A: 5.5,
		B: 10,
		C: 22,
		S: 32,
	},
	chemistry: {
		A: 5.5,
		B: 10,
		C: 22,
		S: 32,
	},
	maths: {
		A: 5.5,
		B: 10,
		C: 22,
		S: 32,
	},
	physics: {
		A: 5.5,
		B: 10,
		C: 22,
		S: 32,
	},
	ict: {
		A: 5.5,
		B: 10,
		C: 22,
		S: 32,
	},
});
