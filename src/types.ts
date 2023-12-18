export type Subject = "maths" | "physics" | "chemistry" | "bio" | "ict";
// TODO add other streams
export type Stream = "MATHS" | "BIO";

export interface SubjectZScoreCalculationValues {
	average?: number;
	standardDeviation?: number;
}
