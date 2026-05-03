import Button from "./Button";

export default function AlertState({ tone = "error", message, onRetry }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`alert-state ${tone}`}>
      <p>{message}</p>
      {onRetry ? (
        <Button variant="ghost" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
