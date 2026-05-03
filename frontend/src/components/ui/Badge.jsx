export default function Badge({ children, tone = "neutral" }) {
  return <span className={`ui-badge ${tone}`}>{children}</span>;
}
