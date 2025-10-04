export type Stage = "upload" | "processing" | "review" | "results";

export type ApplicantDecision = "accepted" | "rejected";

export type ExtractionStatus =
  | "queued"
  | "in-progress"
  | "succeeded"
  | "failed";

export type ApplicantExtraction = {
  givenName: string;
  surname: string;
  email: string;
  summary: string;
};

export type ApplicantRecord = {
  id: string;
  file: File;
  previewUrl: string;
  extraction?: ApplicantExtraction;
  extractionStatus: ExtractionStatus;
  error?: string;
  decision?: ApplicantDecision;
};

export type ProcessingProgress = {
  processed: number;
  total: number;
  inFlight: number;
};

export type PendingUpload = {
  id: string;
  file: File;
};
