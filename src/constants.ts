import { Subject, Stream } from "./types";

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
