import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "./supabase";

const RECOVERY_EMAIL_KEY = "tang-admin-recovery-email";
const RECOVERY_VERIFIED_KEY = "tang-admin-recovery-verified";

export function ResetPasswordPage() {
  const location = useLocation();
  const storedEmail = sessionStorage.getItem(RECOVERY_EMAIL_KEY) || "";
  const [stage, setStage] = useState(location.state?.codeSent || storedEmail ? "otp" : "request");
  const [email, setEmail] = useState(location.state?.email || storedEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(location.state?.codeSent ? "A 6-digit recovery code was sent to your Gmail." : "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resendAvailableIn, setResendAvailableIn] = useState(location.state?.codeSent ? 60 : 0);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const recoveryVerified = sessionStorage.getItem(RECOVERY_VERIFIED_KEY) === "true";
      if (data.session && recoveryVerified) setStage("password");
      else if (data.session) await supabase.auth.signOut({ scope: "local" });
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (resendAvailableIn <= 0) return undefined;
    const timer = window.setInterval(() => setResendAvailableIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableIn]);

  async function requestCode(event) {
    event?.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) { setMessage("Enter your Admin email first."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setMessage(error.message);
    else {
      sessionStorage.setItem(RECOVERY_EMAIL_KEY, normalizedEmail);
      sessionStorage.removeItem(RECOVERY_VERIFIED_KEY);
      setEmail(normalizedEmail);
      setOtp("");
      setStage("otp");
      setResendAvailableIn(60);
      setMessage("A 6-digit recovery code was sent to your Gmail.");
    }
    setBusy(false);
  }

  async function verifyCode(event) {
    event.preventDefault(); setMessage("");
    if (!/^\d{6}$/.test(otp)) { setMessage("Enter the complete 6-digit recovery code."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: "recovery" });
    if (error || !data.session) {
      setMessage(error?.message || "The recovery code is invalid or has expired.");
      setBusy(false);
      return;
    }
    sessionStorage.setItem(RECOVERY_VERIFIED_KEY, "true");
    setStage("password");
    setMessage("Identity verified. You can now choose a new password.");
    setBusy(false);
  }

  async function updatePassword(event) {
    event.preventDefault(); setMessage("");
    if (password.length < 6) { setMessage("Supabase requires a password with at least 6 characters."); return; }
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMessage(error.message); setBusy(false); return; }
    await supabase.auth.signOut();
    sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
    sessionStorage.removeItem(RECOVERY_VERIFIED_KEY);
    sessionStorage.removeItem("tang-admin-otp-verified");
    setSaved(true);
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setBusy(false);
  }

  if (loading) return <div className="admin-loading">Preparing secure recovery…</div>;

  const positiveMessage = message.includes("sent") || message.includes("verified");
  return <main className="admin-login"><div className="admin-login__panel admin-recovery-panel">
    <Link to="/admin"><ArrowLeft /> Back to Admin</Link>
    <span className="eyebrow">Secure recovery</span>
    <h1>Reset Password</h1>

    {saved ? <div className="admin-recovery-success"><CheckCircle size={34} weight="fill" /><h2>Password updated</h2><p>Your old password is no longer valid. Sign in again with your new password and Gmail OTP.</p><Link className="button button--primary" to="/admin">Continue to Admin</Link></div> : <>
      <div className="admin-recovery-steps" aria-label="Password recovery progress">
        <span className={stage !== "request" ? "is-complete" : "is-current"}>1</span><i />
        <span className={stage === "password" ? "is-complete" : stage === "otp" ? "is-current" : ""}>2</span><i />
        <span className={stage === "password" ? "is-current" : ""}>3</span>
      </div>

      {stage === "request" && <form onSubmit={requestCode}>
        <p>Enter your Admin email and we will send a random 6-digit recovery code.</p>
        <label className="admin-field"><span>Admin email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {message && <p className="admin-message admin-message--error">{message}</p>}
        <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Sending…" : <><EnvelopeSimple size={19} /> Send recovery code</>}</button>
      </form>}

      {stage === "otp" && <form onSubmit={verifyCode}>
        <p>Enter the code sent to <strong>{email}</strong>. Only the newest code will work.</p>
        <label className="admin-field"><span>6-digit recovery code</span><input className="admin-otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="6" pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus /></label>
        {message && <p className={positiveMessage ? "admin-message" : "admin-message admin-message--error"}>{message}</p>}
        <button className="button button--primary" type="submit" disabled={busy || otp.length !== 6}>{busy ? "Verifying…" : <><ShieldCheck size={19} /> Verify code</>}</button>
        <button className="button button--ghost" type="button" onClick={() => requestCode()} disabled={busy || resendAvailableIn > 0}>{resendAvailableIn > 0 ? `Resend code in ${resendAvailableIn}s` : "Resend code"}</button>
        <button className="admin-login__text-button" type="button" onClick={() => { setStage("request"); setOtp(""); setMessage(""); }}>Use a different email</button>
      </form>}

      {stage === "password" && <form onSubmit={updatePassword}>
        <p>Your Gmail code was verified. Create a new password and enter it again to confirm.</p>
        <label className="admin-field"><span>New password</span><input type="password" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
        <label className="admin-field"><span>Confirm new password</span><input type="password" minLength="6" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>
        {message && <p className={positiveMessage ? "admin-message" : "admin-message admin-message--error"}>{message}</p>}
        <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Updating…" : "Reset password"}</button>
      </form>}
    </>}
  </div></main>;
}
