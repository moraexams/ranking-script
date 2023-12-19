import { Subject, Stream, ResultValue } from "./types";

export const view__FINAL_MARKS = "final_marks";

export function view__SUBJECT_FINAL_MARKS(subject: Subject) {
	return `final_marks_${subject}`;
}

export function view__Z_SCORE_FOR_SUBJECT(subject: Subject) {
	return `zscore_${subject}`;
}

function _stream(stream: Stream) {
	let s = "";
	for (let i = 0; i < stream.length; i++) {
		let char = stream.charAt(i);
		console.log(char);
		if (char == " " || char == "(" || char == ")") {
			s += "_";
		} else {
			s += char;
		}
	}
	console.log(s);
	return s;
}
export function view__Z_SCORE_FINAL(stream: Stream) {
	return `zscore_final_${_stream(stream).toLowerCase()}`;
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

export const STREAMS_AND_SUBJECTS: Record<
	Stream,
	{ subject1?: Subject; subject2?: Subject; subject3?: Subject }
> = {
	BIO: {
		subject1: "bio",
		subject2: "physics",
		subject3: "chemistry",
	},
	MATHS: {
		subject1: "maths",
		subject2: "physics",
		subject3: "chemistry",
	},
	"ICT (MATHS)": {
		subject1: "maths",
		subject2: "physics",
		subject3: "ict",
	},
	"Agri (BIO)": {
		subject1: "bio",
		subject3: "chemistry",
	},
	"ICT ONLY": {
		subject3: "ict",
	},
	BIO_PHYSICS_ICT: {
		subject1: "bio",
		subject2: "physics",
		subject3: "ict",
	},
	BIO_CHEMISTRY_ICT: {
		subject1: "bio",
		subject3: "chemistry",
	},
};
