import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { supabase } from "./supabase";

export function ResetPasswordPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session));
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionReady(Boolean(session));
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function updatePassword(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) return setMessage("Use at least 8 characters.");
    if (password !== confirmPassword) return setMessage("Passwords do not match.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage(error.message);
    setSaved(true);
    setPassword("");
    setConfirmPassword("");
  }

  if (loading) return <div className="admin-loading">Checking recovery link…</div>;

  return <main className="admin-login"><div className="admin-login__panel">
    <Link to="/admin"><ArrowLeft /> Back to Admin</Link>
    <span className="eyebrow">Secure recovery</span>
    <h1>Reset Password</h1>
    {saved ? <><p className="admin-message"><CheckCircle /> Password updated successfully.</p><Link className="button button--primary" to="/admin">Continue to Admin</Link></> : sessionReady ? <form onSubmit={updatePassword}>
      <label className="admin-field"><span>New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
      <label className="admin-field"><span>Confirm password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>
      {message && <p className="admin-message admin-message--error">{message}</p>}
      <button className="button button--primary" type="submit">Update password</button>
    </form> : <><p className="admin-message admin-message--error">This recovery link is invalid or has expired.</p><p>Return to Admin and request a new password email.</p></>}
  </div></main>;
}
