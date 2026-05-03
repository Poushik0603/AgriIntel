import { useMemo, useState } from "react";
import { useAppContext } from "../../app/AppContext";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import AlertState from "../../components/ui/AlertState";

const initialState = {
  fullName: "",
  email: "",
  password: "",
  role: "USER",
};

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register, session } = useAppContext();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validationErrors = useMemo(() => {
    const nextErrors = {};

    if (mode === "register" && !form.fullName.trim()) {
      nextErrors.fullName = "Full name is required for registration.";
    }
    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!form.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (mode === "register" && form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    return nextErrors;
  }, [form, mode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (Object.keys(validationErrors).length > 0) {
      setError("Please fix the highlighted fields before continuing.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
        setMessage("Welcome back. Your session is active.");
      } else {
        await register(form);
        setMessage("Account created successfully.");
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      title={session ? "Session active" : "Access AgriIntel"}
      description="Use the user service without leaving the product experience."
      footer={
        <div className="auth-footer">
          <Button variant="ghost" onClick={() => setAuthModalOpen(false)}>
            Close
          </Button>
        </div>
      }
    >
      <div className="auth-tabs">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
          Login
        </button>
        <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
          Register
        </button>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <Field label="Full name" helper="This name is used to identify the user account." error={error && validationErrors.fullName ? validationErrors.fullName : ""}>
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Riya Sharma" />
          </Field>
        ) : null}

        <Field label="Email" helper="Use the same email you register with in the backend." error={error && validationErrors.email ? validationErrors.email : ""}>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
        </Field>

        <Field label="Password" helper={mode === "register" ? "Minimum 6 characters." : "Enter your current password."} error={error && validationErrors.password ? validationErrors.password : ""}>
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" />
        </Field>

        {mode === "register" ? (
          <Field label="Role" helper="Keep USER for normal access.">
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </Field>
        ) : null}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Processing..." : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {message ? <AlertState tone="success" message={message} /> : null}
      <AlertState message={error} />
    </Modal>
  );
}
