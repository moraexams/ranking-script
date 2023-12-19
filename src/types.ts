export type Subject = "maths" | "physics" | "chemistry" | "bio" | "ict";
// TODO add other streams
export type Stream =
	| "Agri (BIO)"
	| "BIO"
	| "BIO_CHEMISTRY_ICT"
	| "BIO_PHYSICS_ICT"
	| "ICT (MATHS)"
	| "ICT ONLY"
	| "MATHS";

export type ResultValue = "A" | "B" | "C" | "S" | "W";

export interface SubjectZScoreCalculationValues {
	average?: number;
	standardDeviation?: number;
}
