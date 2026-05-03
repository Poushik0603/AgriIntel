import { Link } from "react-router-dom";
import { useAppContext } from "../app/AppContext";
import { formatDateTime } from "../utils/formatters";

export default function ReportsPage() {
  const { dashboards } = useAppContext();
  const reports = dashboards.filter((item) => item.reportNotes?.trim());

  return (
    <div className="reports-page">
      <section className="section-heading">
        <div>
          <h2>Saved Reports</h2>
          <p>Notes written inside the analytics workspace are collected here for review.</p>
        </div>
        <Link to="/workspace">Open workspace</Link>
      </section>

      {!reports.length ? (
        <div className="empty-deployments">
          <h3>No saved report notes yet.</h3>
          <p>Open an analytics dashboard, write your report notes, and save the report.</p>
        </div>
      ) : (
        <div className="report-grid">
          {reports.map((dashboard) => (
            <article className="report-card" key={dashboard.id}>
              <span>{dashboard.location}</span>
              <h3>{dashboard.title}</h3>
              <p>{dashboard.reportNotes}</p>
              <footer>
                <small>Saved {formatDateTime(dashboard.updatedAt)}</small>
                <Link to={`/workspace/${dashboard.id}`}>Edit report</Link>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
