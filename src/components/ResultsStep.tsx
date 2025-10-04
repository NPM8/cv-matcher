import type { ApplicantRecord } from "../types/app";
import { formatDecision, formatExtractionStatus } from "../utils/format";

type ResultsStepProps = {
  applicants: ApplicantRecord[];
  onExport: () => void;
  onRestart: () => void;
};

const ResultsStep = ({ applicants, onExport, onRestart }: ResultsStepProps) => {
  const accepted = applicants.filter(
    (applicant) => applicant.decision === "accepted",
  ).length;
  const rejected = applicants.filter(
    (applicant) => applicant.decision === "rejected",
  ).length;

  return (
    <div className="results-step">
      <h2>Review complete</h2>
      <p>
        {accepted} accepted · {rejected} rejected · {applicants.length} total
      </p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col">Email</th>
              <th scope="col">Summary</th>
              <th scope="col">Extraction</th>
              <th scope="col">Decision</th>
              <th scope="col">CV file</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((applicant) => {
              const extraction = applicant.extraction;
              const summaryText =
                extraction?.summary ??
                (applicant.extractionStatus === "failed"
                  ? applicant.error ?? "Extraction failed"
                  : "—");

              return (
                <tr key={applicant.id}>
                  <td>
                    {extraction
                      ? `${extraction.givenName} ${extraction.surname}`
                      : "Unknown"}
                  </td>
                  <td>{extraction?.email ?? "—"}</td>
                  <td>{summaryText}</td>
                  <td>
                    <span
                      className={`status-chip table ${applicant.extractionStatus}`}
                    >
                      {formatExtractionStatus(applicant.extractionStatus)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status ${applicant.decision ?? "pending"}`}
                    >
                      {formatDecision(applicant.decision)}
                    </span>
                  </td>
                  <td>{applicant.file.name}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="results-actions">
        <button
          type="button"
          className="action-button export"
          onClick={onExport}
        >
          Export CSV
        </button>
        <button type="button" className="ghost-button" onClick={onRestart}>
          Start over
        </button>
      </div>
    </div>
  );
};

export default ResultsStep;
