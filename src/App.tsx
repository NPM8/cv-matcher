import type { ReactNode } from "react";
import "./App.css";
import ProcessingStep from "./components/ProcessingStep";
import ResultsStep from "./components/ResultsStep";
import ReviewStep from "./components/ReviewStep";
import SettingsDialog from "./components/SettingsDialog";
import UploadStep from "./components/UploadStep";
import { useApplicantWorkflow } from "./hooks/useApplicantWorkflow";

function App() {
  const {
    stage,
    applicants,
    currentIndex,
    currentApplicant,
    processingProgress,
    error,
    geminiKey,
    pendingUploads,
    isSettingsOpen,
    draftKey,
    maxConcurrentRequests,
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
  } = useApplicantWorkflow();

  let stageContent: ReactNode = null;
  switch (stage) {
    case "upload":
      stageContent = (
        <UploadStep
          onFilesSelected={handleFilesSelected}
          pendingFiles={pendingUploads}
          onRemoveFile={removePendingUpload}
          onStartReview={startReview}
          onClearQueue={clearPendingUploads}
        />
      );
      break;
    case "processing":
      stageContent = (
        <ProcessingStep
          processed={processingProgress.processed}
          total={processingProgress.total}
          inFlight={processingProgress.inFlight}
          maxConcurrentRequests={maxConcurrentRequests}
        />
      );
      break;
    case "review":
      stageContent = currentApplicant ? (
        <ReviewStep
          applicant={currentApplicant}
          index={currentIndex}
          total={applicants.length}
          onDecision={handleDecision}
        />
      ) : null;
      break;
    case "results":
      stageContent = (
        <ResultsStep
          applicants={applicants}
          onExport={exportCsv}
          onRestart={resetApp}
        />
      );
      break;
    default:
      stageContent = null;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>CV triage assistant</h1>
          <p>
            Upload candidate CVs, let Gemini craft summaries, and export your
            decisions.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost-button" onClick={openSettings}>
            {geminiKey ? "Settings" : "Add API key"}
          </button>
          {stage !== "upload" && (
            <button type="button" className="ghost-button" onClick={resetApp}>
              Reset
            </button>
          )}
        </div>
      </header>
      {error && <div className="error-banner">{error}</div>}
      <main className={`stage stage-${stage}`}>{stageContent}</main>
      <SettingsDialog
        open={isSettingsOpen}
        draftKey={draftKey}
        onDraftKeyChange={setDraftKey}
        onClose={closeSettings}
        onSave={saveSettings}
        onClear={clearSettingsKey}
      />
    </div>
  );
}

export default App;
