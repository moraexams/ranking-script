export const SUBJECTS = [
	"maths",
	"physics",
	"chemistry",
	"bio",
	"ict",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const STREAMS = [
	"Agri (BIO)",
	"BIO",
	"BIO_CHEMISTRY_ICT",
	"BIO_PHYSICS_ICT",
	"ICT (MATHS)",
	"ICT ONLY",
	"MATHS",
] as const;

export type Stream = (typeof STREAMS)[number];

export const DISTRICTS = [
	"Ampara",
	"Anuradhapura",
	"Badulla",
	"Batticaloa",
	"Colombo",
	"Galle",
	"Gampaha",
	"Hambantota",
	"Jaffna",
	"Kalutara",
	"Kandy",
	"Kegalle",
	"Kilinochchi",
	"Kurunegala",
	"Mannar",
	"Matale",
	"Matara",
	"Mullaitivu",
	"Nuwara Eliya",
	"Puttalam",
	"Trincomalee",
	"Vavuniya",
] as const;

export type District = (typeof DISTRICTS)[number];

export type ResultValue = "A" | "B" | "C" | "S" | "W";
export type ExamPart = "part1" | "part2";

export interface SubjectZScoreCalculationValues {
	average?: number;
	standardDeviation?: number;
}
