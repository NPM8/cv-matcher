import { useRef, useState } from "react";
import type {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
} from "react";
import { formatFileSize } from "../utils/format";
import type { PendingUpload } from "../types/app";

type UploadStepProps = {
  onFilesSelected: (files: FileList | File[]) => void;
  pendingFiles: PendingUpload[];
  onRemoveFile: (id: string) => void;
  onStartReview: () => void;
  onClearQueue: () => void;
};

const UploadStep = ({
  onFilesSelected,
  pendingFiles,
  onRemoveFile,
  onStartReview,
  onClearQueue,
}: UploadStepProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasPending = pendingFiles.length > 0;

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files?.length) {
      onFilesSelected(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      onFilesSelected(event.target.files);
      event.target.value = "";
    }
  };

  return (
    <div className="upload-step">
      <section className="upload-hero">
        <div className="upload-hero-copy">
          <h2>Build your review stack</h2>
          <p>
            Drop in as many PDF resumes as you like. We will batch them up, let
            Gemini craft rich summaries, and then you can glide through
            decisions.
          </p>
          <ul className="upload-checklist">
            <li>Drag & drop several times to keep adding files</li>
            <li>Secure on-device upload directly to Google Gemini</li>
            <li>Start review only when your batch feels ready</li>
          </ul>
        </div>
        <div
          className={`drop-zone ${isDragging ? "dragging" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="drop-visual" aria-hidden>
            <span className="drop-glow" />
            <span className="drop-icon">UP</span>
          </div>
          <p className="drop-title">Drag & drop CV PDFs</p>
          <p className="drop-subtitle">or click to browse your drive</p>
          <button type="button" className="ghost-button">
            Choose files
          </button>
          <p className="drop-meta">Gemini can process up to 20 MB per PDF</p>
        </div>
      </section>
      {hasPending ? (
        <section className="upload-queue" aria-live="polite">
          <header className="upload-queue-header">
            <div>
              <p className="queue-label">Ready for review</p>
              <h3>
                {pendingFiles.length} CV{pendingFiles.length === 1 ? "" : "s"}{" "}
                queued
              </h3>
            </div>
            <div className="upload-queue-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={onClearQueue}
              >
                Clear all
              </button>
            </div>
          </header>
          <ul className="upload-queue-list">
            {pendingFiles.map(({ id, file }) => (
              <li key={id} className="upload-card">
                <div className="upload-card-meta">
                  <span className="upload-card-icon" aria-hidden>
                    PDF
                  </span>
                  <div>
                    <p className="upload-card-name">{file.name}</p>
                    <p className="upload-card-size">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="upload-card-remove"
                  onClick={() => onRemoveFile(id)}
                  aria-label={`Remove ${file.name} from queue`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="upload-actions">
            <button
              type="button"
              className="action-button start"
              onClick={onStartReview}
            >
              Start Gemini review
            </button>
            <p className="upload-tip">
              Need more CVs? Drop them in before starting.
            </p>
          </div>
        </section>
      ) : (
        <div className="upload-empty">
          <p>No CVs queued yet — your uploads will appear here.</p>
        </div>
      )}
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileInput}
      />
    </div>
  );
};

export default UploadStep;
