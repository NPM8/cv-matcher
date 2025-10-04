import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApplicantDecision,
  ApplicantExtraction,
  ApplicantRecord,
  PendingUpload,
  ProcessingProgress,
  Stage,
} from "../types/app";
import { formatExtractionStatus } from "../utils/format";

const API_KEY_STORAGE_KEY = "cv-app/gemini-key";
const MAX_CONCURRENT_REQUESTS = 3;
const REQUEST_JITTER_MS = 150;
const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const makeId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `applicant-${Math.random().toString(36).slice(2, 12)}`;
};

const capitalise = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const inferPersonFromFileName = (file: File) => {
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const tokens = baseName.split(/[^a-zA-Z]+/).filter(Boolean);
  const givenName = tokens[0] ? capitalise(tokens[0]) : "Candidate";
  const surname = tokens[1] ? capitalise(tokens[1]) : "Unknown";
  const emailHandle = tokens.length
    ? tokens.map((token) => token.toLowerCase()).join(".")
    : "candidate";

  return {
    givenName,
    surname,
    email: `${emailHandle}@example.com`,
  };
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const extractApplicantData = async (
  file: File,
  apiKey: string,
): Promise<ApplicantExtraction> => {
  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  const response = await fetch(
    `${GEMINI_API_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [
            {
              text: "You extract structured candidate data from CV PDFs. Respond strictly as JSON with keys givenName, surname, email, and summary. The summary should be 2-3 energetic sentences highlighting top experience and skills. Do not include markdown or extra commentary.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: `Resume file name: ${file.name}` },
              {
                inlineData: {
                  mimeType: file.type || "application/pdf",
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          topP: 0.9,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            required: ["givenName", "surname", "email", "summary"],
            properties: {
              givenName: { type: "string" },
              surname: { type: "string" },
              email: { type: "string" },
              summary: { type: "string" },
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  let rawContent: string | undefined;
  for (const part of parts) {
    if (typeof part?.text === "string") {
      rawContent = part.text;
      break;
    }

    const inlineData = part?.inlineData?.data;
    if (inlineData) {
      try {
        rawContent = atob(inlineData);
        break;
      } catch (error) {
        console.warn("Failed to decode Gemini inline data", error);
      }
    }
  }

  if (!rawContent) {
    throw new Error("Gemini API returned an empty response");
  }

  let parsed: ApplicantExtraction | undefined;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    console.warn("Failed to parse Gemini response as JSON:", error, rawContent);
  }

  if (!parsed) {
    const fallback = inferPersonFromFileName(file);
    return {
      givenName: fallback.givenName,
      surname: fallback.surname,
      email: fallback.email,
      summary: "Summary unavailable. Please retry extraction.",
    };
  }

  return parsed;
};

const escapeCsv = (value: string) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (/["]|[\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

type UseApplicantWorkflowReturn = {
  stage: Stage;
  applicants: ApplicantRecord[];
  currentIndex: number;
  currentApplicant: ApplicantRecord | null;
  processingProgress: ProcessingProgress;
  error: string | null;
  geminiKey: string;
  pendingUploads: PendingUpload[];
  isSettingsOpen: boolean;
  draftKey: string;
  maxConcurrentRequests: number;
  handleFilesSelected: (fileList: FileList | File[]) => void;
  removePendingUpload: (id: string) => void;
  clearPendingUploads: () => void;
  startReview: () => void;
  handleDecision: (decision: ApplicantDecision) => void;
  exportCsv: () => void;
  resetApp: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  saveSettings: () => void;
  clearSettingsKey: () => void;
  setDraftKey: (value: string) => void;
};

export const useApplicantWorkflow = (): UseApplicantWorkflowReturn => {
  const [stage, setStage] = useState<Stage>("upload");
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingProgress, setProcessingProgress] =
    useState<ProcessingProgress>({
      processed: 0,
      total: 0,
      inFlight: 0,
    });
  const [error, setError] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  });
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftKey, setDraftKey] = useState("");

  const previewUrls = useRef(new Set<string>());
  const extractionRunRef = useRef(0);

  const clearPreviewUrls = useCallback(() => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  useEffect(() => () => clearPreviewUrls(), [clearPreviewUrls]);

  const resetApp = useCallback(() => {
    extractionRunRef.current += 1;
    clearPreviewUrls();
    setApplicants([]);
    setCurrentIndex(0);
    setProcessingProgress({ processed: 0, total: 0, inFlight: 0 });
    setStage("upload");
    setError(null);
    setPendingUploads([]);
  }, [clearPreviewUrls]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (geminiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, geminiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [geminiKey]);

  const openSettings = () => {
    setDraftKey(geminiKey);
    setIsSettingsOpen(true);
  };

  const closeSettings = () => setIsSettingsOpen(false);

  const saveSettings = () => {
    setGeminiKey(draftKey.trim());
    setIsSettingsOpen(false);
    setError(null);
  };

  const clearSettingsKey = () => {
    setDraftKey("");
    setGeminiKey("");
  };

  const handleFilesSelected = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const pdfs = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );

    if (!pdfs.length) {
      setError("Please upload PDF files only.");
      return;
    }

    setError(null);
    setPendingUploads((previous) => {
      const signatures = new Set(
        previous.map(
          (item) =>
            `${item.file.name}-${item.file.size}-${item.file.lastModified}`,
        ),
      );
      const additions = pdfs
        .filter(
          (file) =>
            !signatures.has(`${file.name}-${file.size}-${file.lastModified}`),
        )
        .map((file) => ({ id: makeId(), file }));

      if (!additions.length) {
        return previous;
      }

      return [...previous, ...additions];
    });
  }, []);

  const removePendingUpload = useCallback((id: string) => {
    setPendingUploads((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const clearPendingUploads = useCallback(() => {
    setPendingUploads([]);
  }, []);

  const beginExtraction = useCallback(
    (files: File[]) => {
      const pdfs = files.filter(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf"),
      );

      if (!pdfs.length) {
        setError("Please upload PDF files only.");
        return;
      }

      extractionRunRef.current += 1;
      const runId = extractionRunRef.current;

      clearPreviewUrls();
      setCurrentIndex(0);
      setProcessingProgress({ processed: 0, total: pdfs.length, inFlight: 0 });
      setStage("processing");
      setError(null);

      const freshApplicants: ApplicantRecord[] = pdfs.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrls.current.add(previewUrl);
        return {
          id: makeId(),
          file,
          previewUrl,
          extractionStatus: "queued",
        };
      });

      setApplicants(freshApplicants);
      (async () => {
        try {
          const total = freshApplicants.length;
          const concurrency = Math.max(
            1,
            Math.min(MAX_CONCURRENT_REQUESTS, total),
          );
          let nextIndex = 0;
          let hadErrors = false;

          const workers = Array.from({ length: concurrency }, () =>
            (async () => {
              while (true) {
                const currentIndex = nextIndex;
                nextIndex += 1;

                if (currentIndex >= total) return;
                if (extractionRunRef.current !== runId) return;

                const applicant = freshApplicants[currentIndex];

                setApplicants((previous) =>
                  previous.map((item, index) =>
                    index === currentIndex
                      ? {
                          ...item,
                          extractionStatus: "in-progress",
                          error: undefined,
                        }
                      : item,
                  ),
                );
                setProcessingProgress((previous) => ({
                  processed: previous.processed,
                  total: previous.total,
                  inFlight: previous.inFlight + 1,
                }));

                try {
                  if (REQUEST_JITTER_MS > 0) {
                    await wait(Math.random() * REQUEST_JITTER_MS);
                  }

                  const extraction = await extractApplicantData(
                    applicant.file,
                    geminiKey,
                  );
                  if (extractionRunRef.current !== runId) return;

                  setApplicants((previous) =>
                    previous.map((item, index) =>
                      index === currentIndex
                        ? {
                            ...item,
                            extraction,
                            extractionStatus: "succeeded",
                            error: undefined,
                          }
                        : item,
                    ),
                  );
                } catch (err) {
                  if (extractionRunRef.current !== runId) return;
                  console.error(err);
                  hadErrors = true;
                  const message =
                    err instanceof Error ? err.message : "Unknown error";
                  setApplicants((previous) =>
                    previous.map((item, index) =>
                      index === currentIndex
                        ? {
                            ...item,
                            extractionStatus: "failed",
                            error: message,
                          }
                        : item,
                    ),
                  );
                } finally {
                  if (extractionRunRef.current === runId) {
                    setProcessingProgress((previous) => ({
                      processed: previous.processed + 1,
                      total: previous.total,
                      inFlight: Math.max(0, previous.inFlight - 1),
                    }));
                  }
                }
              }
            })(),
          );

          await Promise.all(workers);

          if (extractionRunRef.current !== runId) return;

          setCurrentIndex(0);
          setStage("review");
          if (hadErrors) {
            setError(
              "Some CVs failed to extract. You can review them manually or retry.",
            );
          } else {
            setError(null);
          }
        } catch (err) {
          console.error(err);
          if (extractionRunRef.current === runId) {
            setError("Failed to extract applicant details. Please try again.");
            setStage("upload");
          }
        }
      })();
    },
    [clearPreviewUrls, geminiKey],
  );

  const startReview = useCallback(() => {
    if (!pendingUploads.length) {
      setError("Upload at least one CV before starting the review.");
      return;
    }

    if (!geminiKey) {
      setError("Add your Gemini API key in Settings before processing CVs.");
      setIsSettingsOpen(true);
      return;
    }

    const files = pendingUploads.map((item) => item.file);
    setError(null);
    beginExtraction(files);
    setPendingUploads([]);
  }, [pendingUploads, geminiKey, beginExtraction]);

  const handleDecision = (decision: ApplicantDecision) => {
    if (!applicants.length) return;

    setApplicants((previous) =>
      previous.map((applicant, index) =>
        index === currentIndex ? { ...applicant, decision } : applicant,
      ),
    );

    const nextIndex = currentIndex + 1;
    if (nextIndex < applicants.length) {
      setCurrentIndex(nextIndex);
    } else {
      setStage("results");
    }
  };

  const exportCsv = () => {
    if (!applicants.length) return;

    const headers = [
      "Given name",
      "Surname",
      "Email",
      "Summary",
      "Extraction status",
      "CV file",
    ];
    const rows = applicants
      .filter(({ decision }) => decision === "accepted")
      .map((applicant) => {
        const extraction = applicant.extraction;
        return [
          extraction?.givenName ?? "",
          extraction?.surname ?? "",
          extraction?.email ?? "",
          extraction?.summary ?? applicant.error ?? "",
          formatExtractionStatus(applicant.extractionStatus),
          applicant.file.name,
        ]
          .map(escapeCsv)
          .join(",");
      });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `cv-review-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return {
    stage,
    applicants,
    currentIndex,
    currentApplicant: applicants[currentIndex] ?? null,
    processingProgress,
    error,
    geminiKey,
    pendingUploads,
    isSettingsOpen,
    draftKey,
    maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
    handleFilesSelected,
    removePendingUpload,
    clearPendingUploads,
    startReview,
    handleDecision,
    exportCsv,
    resetApp,
    openSettings,
    closeSettings,
    saveSettings,
    clearSettingsKey,
    setDraftKey,
  };
};
