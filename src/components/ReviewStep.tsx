import { useState } from "react";
import type { ApplicantDecision, ApplicantRecord } from "../types/app";
import { formatExtractionStatus } from "../utils/format";

type ReviewStepProps = {
  applicant: ApplicantRecord;
  index: number;
  total: number;
  onDecision: (decision: ApplicantDecision) => void;
};

const ReviewStep = ({ applicant, index, total, onDecision }: ReviewStepProps) => {
  const extraction = applicant.extraction;
  const { extractionStatus, error } = applicant;
  const isFailed = extractionStatus === "failed";
  const isProcessing =
    extractionStatus === "in-progress" || extractionStatus === "queued";
  const summaryCopy = isFailed
    ? `Extraction failed: ${error ?? "Unknown error. Open the CV to review manually."}`
    : isProcessing
      ? "Extraction still running. Please wait or open the CV to review manually."
      : extraction?.summary ?? "No summary available.";
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

  return (
    <div className="review-stage">
      <aside
        className={`review-side ${isSummaryCollapsed ? "collapsed" : ""}`}
        aria-label="Extracted details"
      >
        <button
          type="button"
          className="review-side-toggle"
          onClick={() => setIsSummaryCollapsed((previous) => !previous)}
          aria-expanded={!isSummaryCollapsed}
          aria-controls="candidate-details"
        >
          {isSummaryCollapsed ? "Show details" : "Hide details"}
        </button>
        <div
          className="review-side-content"
          id="candidate-details"
          aria-hidden={isSummaryCollapsed}
        >
          <header className="review-side-header">
            <p className="panel-label">Candidate</p>
            <h2>
              {extraction
                ? `${extraction.givenName} ${extraction.surname}`
                : "Awaiting extraction"}
            </h2>
            <p className="review-email">{extraction?.email ?? "—"}</p>
          </header>
          <p className={`review-summary-text${isFailed ? " error" : ""}`}>
            {summaryCopy}
          </p>
          <div className="review-side-meta">
            <span className="badge">
              CV {index + 1} of {total}
            </span>
            <span className={`status-chip ${extractionStatus}`}>
              {formatExtractionStatus(extractionStatus)}
            </span>
          </div>
          <a
            className="link side-link"
            href={applicant.previewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open original PDF
          </a>
        </div>
      </aside>
      <section className="review-main" aria-label="CV preview">
        <div className="review-main-header">
          <div>
            <p className="review-stage-label">Now reviewing</p>
            <h2>
              {extraction
                ? `${extraction.givenName} ${extraction.surname}`
                : applicant.file.name}
            </h2>
          </div>
          <div className="review-main-meta">
            <span className="file-name" title={applicant.file.name}>
              {applicant.file.name}
            </span>
            <span className="pages-hint">PDF preview</span>
          </div>
        </div>
        <div className="review-viewer">
          <iframe
            title={`${applicant.file.name} preview`}
            src={applicant.previewUrl}
          />
        </div>
        <div className="review-bottom-bar">
          <div className="review-bottom-text">
            <p className="decision-title">Move this candidate forward?</p>
            <p className="decision-hint">
              You can revisit your choices from the summary page.
            </p>
          </div>
          <div className="review-bottom-actions">
            <button
              type="button"
              className="action-button accept"
              onClick={() => onDecision("accepted")}
            >
              Yes, shortlist
            </button>
            <button
              type="button"
              className="action-button reject"
              onClick={() => onDecision("rejected")}
            >
              No, pass
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReviewStep;
