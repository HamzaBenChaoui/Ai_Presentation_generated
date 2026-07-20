// Sign In / Sign Up modal.
//
// Talks to the backend only through the typed authApi client. On success the
// AuthContext updates the current user and the modal closes. Any backend
// error (409 conflict, 401 invalid credentials, 422 validation) is shown
// inline — no fake UI logic.

import { useState } from "react";
import { ApiClientError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Props {
  mode: "signin" | "signup";
  onClose: () => void;
}

export default function AuthModal({ mode, onClose }: Props) {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName || undefined);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6,6,16,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#0f0f1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "18px",
          padding: "32px",
          color: "#eeeeff",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 800,
            fontFamily: "Syne, sans-serif",
            margin: "0 0 6px",
          }}
        >
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>
        <p style={{ color: "#6b6b8a", fontSize: "14px", margin: "0 0 24px" }}>
          {isSignUp
            ? "Start generating stunning presentations with Slide AI."
            : "Sign in to access your presentations."}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {isSignUp && (
            <Field
              label="Full name"
              type="text"
              value={fullName}
              onChange={setFullName}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />

          {error && (
            <div
              style={{
                fontSize: "13px",
                color: "#ff6b81",
                backgroundColor: "rgba(255,75,97,0.1)",
                border: "1px solid rgba(255,75,97,0.3)",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            style={{
              marginTop: "4px",
              padding: "12px",
              border: "none",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #7c6aff, #ff6ac1)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: submitting || !email || !password ? 0.6 : 1,
            }}
          >
            {submitting
              ? "Please wait…"
              : isSignUp
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <p style={{ color: "#6b6b8a", fontSize: "13px", marginTop: "20px", textAlign: "center" }}>
          {isSignUp ? "Already have an account? " : "New to Slide AI? "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp((v) => !v);
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#7c6aff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "#6b6b8a",
            fontSize: "22px",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: "#6b6b8a",
          marginBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: "100%",
          padding: "11px 14px",
          backgroundColor: "#17172a",
          border: "1.5px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          color: "#eeeeff",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}
