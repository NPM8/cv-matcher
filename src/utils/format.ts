import type { ApplicantDecision, ExtractionStatus } from "../types/app";

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "—";
  const thresholds = [
    { unit: "GB", value: 1024 ** 3 },
    { unit: "MB", value: 1024 ** 2 },
    { unit: "KB", value: 1024 },
  ];

  for (const { unit, value } of thresholds) {
    if (bytes >= value) {
      const precision = bytes >= value * 10 ? 0 : 1;
      return `${(bytes / value).toFixed(precision)} ${unit}`;
    }
  }

  return `${bytes} B`;
};

export const formatDecision = (decision?: ApplicantDecision) => {
  if (!decision) return "Pending";
  return decision === "accepted" ? "Accepted" : "Rejected";
};

export const formatExtractionStatus = (status: ExtractionStatus) => {
  switch (status) {
    case "succeeded":
      return "Extraction complete";
    case "failed":
      return "Extraction failed";
    case "in-progress":
      return "Processing…";
    case "queued":
    default:
      return "Queued";
  }
};
