export type Subject = "maths" | "physics" | "chemistry" | "bio" | "ict";
// TODO add other streams
export type Stream = "MATHS" | "BIO" | "MATHS_ICT";

export type ResultValue = "A" | "B" | "C" | "S" | "W";

export interface SubjectZScoreCalculationValues {
	average?: number;
	standardDeviation?: number;
}
