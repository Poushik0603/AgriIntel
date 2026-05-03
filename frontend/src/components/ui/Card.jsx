export default function Card({ title, subtitle, action, className = "", children }) {
  return (
    <section className={`ui-card ${className}`.trim()}>
      {(title || subtitle || action) ? (
        <header className="ui-card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div>{children}</div>
    </section>
  );
}
