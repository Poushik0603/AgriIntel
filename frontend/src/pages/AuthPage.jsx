import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../app/AppContext";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  organization: "",
  workAddress: "",
  role: "USER",
};

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAppContext();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";
  const destination = location.state?.from || "/dashboard";

  const validationErrors = useMemo(() => {
    const next = {};
    if (isRegister && !form.fullName.trim()) {
      next.fullName = "Full name is required.";
    }
    if (!form.email.trim()) {
      next.email = "Email is required.";
    }
    if (!form.password.trim()) {
      next.password = "Password is required.";
    } else if (isRegister && form.password.length < 6) {
      next.password = "Use at least 6 characters.";
    }
    return next;
  }, [form, isRegister]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (Object.keys(validationErrors).length) {
      setError("Please complete the highlighted fields.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="auth-brand" to="/">
        <span className="brand-mark small" />
        <strong>AgriIntel</strong>
      </Link>

      <section className="auth-panel">
        <p className="eyebrow">{isRegister ? "Create workspace" : "Workspace access"}</p>
        <h1>{isRegister ? "Start agricultural intelligence with your field profile" : "Analyze agricultural decisions with data-driven intelligence"}</h1>
        <p className="auth-copy">
          {isRegister
            ? "Sign up to create dashboards, save reports, track company details, and return to your analysis history."
            : "Login to access your dashboards, saved reports, profile, and market workspace."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <label>
                Full name
                <input
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  placeholder="Riya Sharma"
                />
                {error && validationErrors.fullName ? <small>{validationErrors.fullName}</small> : null}
              </label>
              <label>
                Company
                <input
                  value={form.organization}
                  onChange={(event) => setForm({ ...form, organization: event.target.value })}
                  placeholder="Midnight Harvest Labs"
                />
              </label>
              <label>
                Work address
                <input
                  value={form.workAddress}
                  onChange={(event) => setForm({ ...form, workAddress: event.target.value })}
                  placeholder="Chennai, Tamil Nadu"
                />
              </label>
            </>
          ) : null}

          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="analyst@midnight-harvest.com"
            />
            {error && validationErrors.email ? <small>{validationErrors.email}</small> : null}
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="********"
            />
            {error && validationErrors.password ? <small>{validationErrors.password}</small> : null}
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-link auth-submit" type="submit" disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "Need a workspace?"}{" "}
          <Link to={isRegister ? "/login" : "/signup"}>{isRegister ? "Login" : "Sign up"}</Link>
        </p>
      </section>
    </main>
  );
}
