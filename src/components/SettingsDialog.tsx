import type { ChangeEvent, FormEvent } from "react";

type SettingsDialogProps = {
  open: boolean;
  draftKey: string;
  onDraftKeyChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onClear: () => void;
};

const SettingsDialog = ({
  open,
  draftKey,
  onDraftKeyChange,
  onClose,
  onSave,
  onClear,
}: SettingsDialogProps) => {
  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onDraftKeyChange(event.target.value);
  };

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-dialog">
        <header className="settings-header">
          <div>
            <h2>Settings</h2>
            <p>
              Add your Gemini API key to extract details directly from uploaded
              CVs.
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="settings-form" onSubmit={handleSubmit}>
          <label className="settings-label" htmlFor="gemini-key">
            Gemini API key
          </label>
          <input
            id="gemini-key"
            type="password"
            className="settings-input"
            placeholder="AIza..."
            value={draftKey}
            onChange={handleChange}
            autoComplete="off"
          />
          <p className="settings-hint">
            The key is stored only in this browser using <code>localStorage</code>
            . Requests are sent directly to Google Gemini from your device.
          </p>
          <div className="settings-actions">
            <button type="submit" className="action-button accept">
              Save
            </button>
            <button type="button" className="ghost-button" onClick={onClear}>
              Remove key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsDialog;
