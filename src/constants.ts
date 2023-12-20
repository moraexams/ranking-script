import { Subject, Stream, ResultValue } from "./types";

export const view__FINAL_MARKS = "final_marks";
export const view__FINAL_RESULTS = "view_final_results";
export const table__FINAL_RESULTS = "table_final_results";

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
		if (char == " " || char == "(" || char == ")") {
			s += "_";
		} else {
			s += char.toLowerCase();
		}
	}
	console.log("_stream", s);
	return s;
}
export function view__Z_SCORE_FINAL(stream: Stream) {
	return `zscore_final_${_stream(stream)}`;
}
export function view__STREAM_RANKING(stream: Stream) {
	return `stream_ranking_${_stream(stream)}`;
}

export const table__STUDENTS = "tbl_students";
export const table__MARKS = "tbl_marks";
export const table__EXAM_CENTRES = "tbl_exam_centres";
export const table_EXAM_DISTRICTS = "tbl_exam_districts";

function calculateMinimumPercentiles(
	percentilesObj: Record<Subject, Record<Exclude<ResultValue, "W">, number>>
): Record<Subject, Record<ResultValue, number>> {
	const outputEntries = Object.entries(percentilesObj).map(
		([subject, value]) => {
			const valueB = value.A + value.B;
			const valueC = valueB + value.C;
			const valueS = valueC + value.S;

			return [
				subject,
				{ A: value.A, B: valueB, C: valueC, S: valueS, W: 100 },
			] as [Subject, Record<ResultValue, number>];
		}
	);

	// @ts-expect-error
	return Object.fromEntries(outputEntries);
}

/**
 * Defines maximum percentiles for each result (A, B, C, S, W)
 * with respect to each subject
 */
export const SUBJECT_RESULTS_DISTRICTION_PERCENTILES =
	calculateMinimumPercentiles({
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
