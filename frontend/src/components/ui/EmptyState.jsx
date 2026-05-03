import Button from "./Button";

export default function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="empty-panel">
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
