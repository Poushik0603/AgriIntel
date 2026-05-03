import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../app/AppContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { apiBase, logout, session, setApiBase, updateProfile } = useAppContext();
  const [form, setForm] = useState({
    fullName: session?.fullName || "",
    organization: session?.organization || "",
    workAddress: session?.workAddress || "",
  });
  const [gateway, setGateway] = useState(apiBase);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      setApiBase(gateway);
      await updateProfile(form);
      setMessage("Profile updated successfully.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  const completion = Math.max(10, Number(session?.profileCompletion || 0));

  return (
    <div className="profile-page">
      <section className="profile-summary">
        <div className="avatar-large" />
        <div>
          <span>Profile completion</span>
          <h2>{completion}% complete</h2>
          <p>{session?.email}</p>
          <div className="progress-track">
            <span style={{ width: `${completion}%` }} />
          </div>
        </div>
      </section>

      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          Full name
          <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        </label>
        <label>
          Company
          <input
            value={form.organization}
            onChange={(event) => setForm({ ...form, organization: event.target.value })}
            placeholder="Company or institution"
          />
        </label>
        <label>
          Work address
          <input
            value={form.workAddress}
            onChange={(event) => setForm({ ...form, workAddress: event.target.value })}
            placeholder="City, state"
          />
        </label>
        <label>
          API gateway URL
          <input value={gateway} onChange={(event) => setGateway(event.target.value)} placeholder="Blank uses Vite proxy" />
        </label>

        {message ? <div className="workspace-message">{message}</div> : null}
        {error ? <div className="workspace-message error">{error}</div> : null}

        <div className="button-row">
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Update profile"}
          </button>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </form>
    </div>
  );
}
