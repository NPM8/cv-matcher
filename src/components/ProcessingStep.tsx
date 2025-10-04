import type { ProcessingProgress } from "../types/app";

type ProcessingStepProps = ProcessingProgress & {
  maxConcurrentRequests: number;
};

const ProcessingStep = ({
  processed,
  total,
  inFlight,
  maxConcurrentRequests,
}: ProcessingStepProps) => {
  const percentage = total ? Math.round((processed / total) * 100) : 0;
  const remaining = Math.max(0, total - processed - inFlight);

  return (
    <div className="processing-step">
      <div className="spinner" aria-hidden />
      <h2>Extracting applicant data…</h2>
      <p className="processing-hint">
        Processed {processed} of {total} CV{total === 1 ? "" : "s"} (
        {percentage}% complete)
      </p>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-bar" style={{ width: `${percentage}%` }} />
      </div>
      <div className="processing-meta">
        <span>{processed} completed</span>
        <span>{remaining} in queue</span>
        <span>{inFlight} running</span>
      </div>
      <p className="processing-hint subdued">
        Running up to {maxConcurrentRequests} requests in parallel to respect
        rate limits.
      </p>
    </div>
  );
};

export default ProcessingStep;
