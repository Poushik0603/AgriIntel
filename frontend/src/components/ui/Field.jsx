export default function Field({ label, helper, optional = false, error, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {optional ? <em>Optional</em> : null}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
      {!error && helper ? <span className="field-helper">{helper}</span> : null}
    </label>
  );
}
