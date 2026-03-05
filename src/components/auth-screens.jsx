import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

// ============================================================
// AUTH FLOW — Hot—Pots (Supabase Auth)
// ============================================================
// SCREENS:
//   1. Splash        — logo + tagline, entry point
//   2. Sign In       — email + password, link to sign up, forgot password
//   3. Sign Up       — display name, email, password, confirm password
//   4. Magic Link    — alternative: email-only, sends magic link (Supabase)
//   5. Check Email   — post-magic-link / post-signup confirmation screen
//   6. Forgot Pwd    — email input, sends reset link
//   7. New Password  — set new password (landed from reset email link)
//   8. Onboarding    — first-time profile setup after signup
//      (display name, optional bio, studio location hint)
//
// SUPABASE INTEGRATION NOTES:
//   Sign In:       supabase.auth.signInWithPassword({ email, password })
//   Sign Up:       supabase.auth.signUp({ email, password })
//                  then insert into profiles (id, display_name)
//   Magic Link:    supabase.auth.signInWithOtp({ email })
//   Forgot Pwd:    supabase.auth.resetPasswordForEmail(email)
//   New Password:  supabase.auth.updateUser({ password })
//   Session:       supabase.auth.onAuthStateChange() to detect login
//   Studio gate:   Optionally restrict sign-up to allowed email domains
//                  or require admin approval via a `profiles.approved` flag
// ============================================================

const LOGO_B64 = "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";
const LOGO = `data:image/png;base64,${LOGO_B64}`;

// ── Shared styles ─────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #FDF0E0;
    color: #44200A;
    min-height: 100vh;
  }

  .auth-shell {
    max-width: 420px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #FDF0E0;
    position: relative;
    overflow: hidden;
  }

  /* Organic blobs */
  .auth-shell::before {
    content: '';
    position: fixed; top: -100px; right: -80px;
    width: 320px; height: 320px;
    border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
    background: radial-gradient(ellipse, #E8450A22, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .auth-shell::after {
    content: '';
    position: fixed; bottom: 80px; left: -60px;
    width: 260px; height: 260px;
    border-radius: 40% 60% 30% 70% / 60% 40% 70% 30%;
    background: radial-gradient(ellipse, #D9770618, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  .auth-scroll {
    flex: 1;
    overflow-y: auto;
    position: relative;
    z-index: 10;
  }

  /* ── SPLASH ── */
  .splash {
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 32px;
    text-align: center;
  }
  .splash-logo {
    width: 88px; height: 88px; object-fit: contain;
    margin-bottom: 20px;
    filter: drop-shadow(0 8px 24px #E8450A44);
    animation: floatLogo 3.5s ease-in-out infinite;
  }
  @keyframes floatLogo {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-8px); }
  }
  .splash-wordmark {
    font-family: 'Playfair Display', serif;
    font-size: 36px; font-weight: 700;
    color: #44200A; letter-spacing: -1px;
    margin-bottom: 10px;
  }
  .splash-wordmark em { font-style: italic; color: #E8450A; }
  .splash-tagline {
    font-size: 15px; color: #92400E; line-height: 1.6;
    max-width: 260px; margin: 0 auto 48px;
  }
  .splash-cta {
    width: 100%;
    display: flex; flex-direction: column; gap: 12px;
  }

  /* ── SCREEN WRAPPER ── */
  .auth-screen {
    padding: 0 26px 48px;
    display: flex; flex-direction: column;
  }

  /* Back button row */
  .auth-top-bar {
    padding: 18px 26px 0;
    display: flex; align-items: center; gap: 10px;
    position: relative; z-index: 10;
  }
  .back-btn {
    background: none; border: none; cursor: pointer;
    color: #E8450A; font-size: 22px; line-height: 1;
    padding: 2px 4px; transition: transform 0.15s;
  }
  .back-btn:hover { transform: translateX(-2px); }

  /* Logo row inside screens */
  .auth-logo-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 28px; padding-top: 24px;
  }
  .auth-logo-img { width: 34px; height: 34px; object-fit: contain; }
  .auth-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 700; color: #44200A;
  }
  .auth-logo-text em { font-style: italic; color: #E8450A; }

  /* Screen heading */
  .auth-heading {
    font-family: 'Playfair Display', serif;
    font-size: 26px; font-weight: 700;
    color: #44200A; margin-bottom: 6px; line-height: 1.2;
  }
  .auth-subheading {
    font-size: 13px; color: #92400E; margin-bottom: 28px; line-height: 1.55;
  }

  /* Form */
  .auth-field { margin-bottom: 14px; }
  .auth-label {
    display: block; font-size: 12px; font-weight: 600;
    color: #92400E; margin-bottom: 6px; letter-spacing: 0.2px;
  }
  .auth-input {
    width: 100%; padding: 13px 16px;
    border: 1.5px solid #D9770650; border-radius: 14px;
    font-family: 'DM Sans', sans-serif; font-size: 14px;
    color: #44200A; background: white; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .auth-input:focus {
    border-color: #E8450A;
    box-shadow: 0 0 0 3px #E8450A18;
  }
  .auth-input.error { border-color: #C1440E; background: #FFF5F0; }
  .auth-input-wrap { position: relative; }
  .auth-input-wrap .auth-input { padding-right: 46px; }
  .eye-btn {
    position: absolute; right: 14px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    font-size: 17px; color: #92400E; line-height: 1;
  }
  .field-error {
    font-size: 11px; color: #C1440E; margin-top: 5px;
    display: flex; align-items: center; gap: 4px;
  }

  /* Primary button */
  .auth-btn {
    display: block; width: 100%; padding: 14px;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; border: none; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px; font-weight: 600; cursor: pointer;
    margin-top: 6px;
    transition: all 0.2s;
    box-shadow: 0 4px 16px #E8450A44;
  }
  .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px #E8450A55; }
  .auth-btn:active { transform: translateY(0); }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .auth-btn.loading { opacity: 0.8; }

  /* Ghost / outline button */
  .auth-btn-ghost {
    display: block; width: 100%; padding: 13px;
    background: transparent; color: #E8450A;
    border: 1.5px solid #E8450A; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px; font-weight: 500; cursor: pointer;
    transition: all 0.18s; margin-top: 10px;
  }
  .auth-btn-ghost:hover { background: #E8450A0f; }

  /* Divider */
  .auth-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 20px 0; color: #B45309; font-size: 12px;
  }
  .auth-divider::before, .auth-divider::after {
    content: ''; flex: 1; height: 1px; background: #D9770640;
  }

  /* Footer link row */
  .auth-footer {
    text-align: center; margin-top: 24px;
    font-size: 13px; color: #92400E;
  }
  .auth-link {
    color: #E8450A; font-weight: 600; cursor: pointer;
    background: none; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    text-decoration: underline; text-underline-offset: 2px;
  }
  .auth-link:hover { color: #D4380D; }

  /* Inline text link (e.g. Forgot password) */
  .auth-inline-link {
    font-size: 12px; color: #E8450A; font-weight: 500;
    cursor: pointer; background: none; border: none;
    font-family: 'DM Sans', sans-serif;
    float: right; margin-top: -2px;
    text-decoration: underline; text-underline-offset: 2px;
  }

  /* Success / info box */
  .auth-info-box {
    background: #FEF3C7; border: 1px solid #D9770640;
    border-radius: 16px; padding: 20px;
    text-align: center; margin-bottom: 24px;
  }
  .auth-info-icon { font-size: 40px; margin-bottom: 12px; }
  .auth-info-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; color: #44200A; margin-bottom: 8px;
  }
  .auth-info-text { font-size: 13px; color: #92400E; line-height: 1.6; }

  /* Password strength bar */
  .pwd-strength { margin-top: 6px; }
  .pwd-strength-bar {
    height: 4px; border-radius: 4px; background: #E5D0B8;
    overflow: hidden; margin-bottom: 4px;
  }
  .pwd-strength-fill {
    height: 100%; border-radius: 4px; transition: width 0.3s, background 0.3s;
  }
  .pwd-strength-label { font-size: 11px; }

  /* Onboarding avatar picker */
  .avatar-pick {
    display: flex; flex-direction: column; align-items: center;
    margin-bottom: 24px;
  }
  .avatar-circle {
    width: 80px; height: 80px; border-radius: 50%;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 28px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px; cursor: pointer;
    transition: transform 0.2s;
    box-shadow: 0 4px 16px #E8450A44;
  }
  .avatar-circle:hover { transform: scale(1.06); }
  .avatar-pick-label { font-size: 12px; color: #92400E; }

  /* Progress dots (onboarding) */
  .onboard-progress {
    display: flex; gap: 6px; justify-content: center; margin-bottom: 28px;
  }
  .onboard-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #D9770640; transition: all 0.2s;
  }
  .onboard-dot.active { background: #E8450A; width: 20px; border-radius: 4px; }
  .onboard-dot.done { background: #E8450A88; }

  /* Studio code field */
  .studio-code-row {
    display: flex; gap: 8px;
  }
  .studio-code-row .auth-input { letter-spacing: 4px; font-weight: 600; font-size: 18px; text-align: center; }

  /* Terms text */
  .terms-text {
    font-size: 11px; color: #92400E; text-align: center;
    line-height: 1.6; margin-top: 16px;
  }
  .terms-text a { color: #E8450A; text-decoration: underline; cursor: pointer; }
`;

// ── Password strength helper ──────────────────────────────────
function pwdStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: "Too short", color: "#C1440E", w: "25%" },
    { label: "Weak",      color: "#E8450A", w: "40%" },
    { label: "Fair",      color: "#D97706", w: "65%" },
    { label: "Good",      color: "#92400E", w: "80%" },
    { label: "Strong",    color: "#16a34a", w: "100%" },
  ];
  return { ...map[score], score };
}

// ── Main auth demo component ──────────────────────────────────
export default function AuthScreens({ onAuthComplete }) {
  const [screen, setScreen] = useState("splash"); // splash | signin | signup | magic | checkemail | forgot | newpwd | onboard1 | onboard2
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwdMismatch, setPwdMismatch] = useState(false);
  const [authError, setAuthError] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Pre-fill invite code and jump to signup if URL contains ?code=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setInviteCode(code.toUpperCase());
      setScreen("signup");
    }
  }, []);

  const strength = pwdStrength(pwd);
  const initials = displayName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) || "?";

  const clearError = () => setAuthError("");

  // Clear password mismatch error whenever the user navigates to a different screen
  useEffect(() => { setPwdMismatch(false); }, [screen]);

  // ── Auth handlers ────────────────────────────────────────────

  const handleSignIn = async () => {
    setLoading(true); clearError();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) { setAuthError(error.message); return; }
    onAuthComplete?.();
  };

  const handleSignUp = async () => {
    if (pwd !== confirmPwd) { setPwdMismatch(true); return; }
    setLoading(true); clearError();
    const { error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) { setAuthError(error.message); return; }
    setScreen("checkemail");
  };

  const handleMagicLink = async () => {
    setLoading(true); clearError();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) { setAuthError(error.message); return; }
    setScreen("checkemail");
  };

  const handleForgotPassword = async () => {
    setLoading(true); clearError();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?screen=newpwd`,
    });
    setLoading(false);
    if (error) { setAuthError(error.message); return; }
    setScreen("checkemail");
  };

  const handleNewPassword = async () => {
    if (pwd !== confirmPwd) { setPwdMismatch(true); return; }
    setLoading(true); clearError();
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) { setAuthError(error.message); return; }
    setScreen("signin");
  };

  const handleInviteCode = async (code) => {
    if (!code) { onAuthComplete?.(); return; } // skip
    setLoading(true); clearError();
    const { data, error } = await supabase
      .from("studio_codes")
      .select("id, used_count, max_uses")
      .eq("code", code.toUpperCase())
      .eq("active", true)
      .single();
    if (error || !data) {
      setLoading(false);
      setAuthError("Invalid or expired invite code.");
      return;
    }
    if (data.max_uses !== null && data.used_count >= data.max_uses) {
      setLoading(false);
      setAuthError("This invite code has reached its limit.");
      return;
    }
    await supabase
      .from("studio_codes")
      .update({ used_count: data.used_count + 1 })
      .eq("id", data.id);
    setLoading(false);
    onAuthComplete?.();
  };

  // ── SPLASH ──────────────────────────────────────────────────
  if (screen === "splash") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-scroll">
          <div className="splash">
            <img src={LOGO} alt="Hot—Pots" className="splash-logo" />
            <div className="splash-wordmark">Hot—<em>Pots</em></div>
            <div className="splash-tagline">
              The pottery swap community for your studio. Give a piece, get a piece.
            </div>
            <div className="splash-cta">
              <button className="auth-btn" onClick={()=>setScreen("signup")}>Create an Account</button>
              <button className="auth-btn-ghost" onClick={()=>setScreen("signin")}>Sign In</button>
              <div className="auth-divider">or</div>
              <button className="auth-btn-ghost" onClick={()=>setScreen("magic")} style={{marginTop:0}}>
                ✉️ Sign in with Magic Link
              </button>
            </div>
            <div className="terms-text" style={{marginTop:28}}>
              By continuing you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── SIGN IN ─────────────────────────────────────────────────
  if (screen === "signin") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-top-bar">
          <button className="back-btn" onClick={()=>setScreen("splash")}>←</button>
        </div>
        <div className="auth-scroll">
          <div className="auth-screen">
            <div className="auth-logo-row">
              <img src={LOGO} className="auth-logo-img" alt="" />
              <span className="auth-logo-text">Hot—<em>Pots</em></span>
            </div>
            <div className="auth-heading">Welcome back</div>
            <div className="auth-subheading">Sign in to your studio account</div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@studio.com"
                value={email} onChange={e=>{ setEmail(e.target.value); clearError(); }} />
            </div>

            <div className="auth-field">
              <label className="auth-label">
                Password
                <button className="auth-inline-link" onClick={()=>setScreen("forgot")}>Forgot password?</button>
              </label>
              <div className="auth-input-wrap">
                <input className="auth-input" type={showPwd?"text":"password"}
                  placeholder="Your password"
                  value={pwd} onChange={e=>{ setPwd(e.target.value); clearError(); }} />
                <button className="eye-btn" onClick={()=>setShowPwd(p=>!p)}>{showPwd?"🙈":"👁️"}</button>
              </div>
            </div>

            {authError && <div className="field-error" style={{marginBottom:8}}>⚠ {authError}</div>}

            <button className="auth-btn" style={{marginTop:20}}
              disabled={!email || !pwd || loading}
              onClick={handleSignIn}>
              {loading ? "Signing in…" : "Sign In"}
            </button>

            <div className="auth-divider">or</div>
            <button className="auth-btn-ghost" style={{marginTop:0}} onClick={()=>setScreen("magic")}>
              ✉️ Use Magic Link instead
            </button>

            <div className="auth-footer">
              Don't have an account?{" "}
              <button className="auth-link" onClick={()=>setScreen("signup")}>Sign up</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── SIGN UP ─────────────────────────────────────────────────
  if (screen === "signup") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-top-bar">
          <button className="back-btn" onClick={()=>setScreen("splash")}>←</button>
        </div>
        <div className="auth-scroll">
          <div className="auth-screen">
            <div className="auth-logo-row">
              <img src={LOGO} className="auth-logo-img" alt="" />
              <span className="auth-logo-text">Hot—<em>Pots</em></span>
            </div>
            <div className="auth-heading">Join the studio</div>
            <div className="auth-subheading">Create your Hot—Pots account</div>

            <div className="auth-field">
              <label className="auth-label">Display Name</label>
              <input className="auth-input" type="text" placeholder="How you'll appear to other members"
                value={displayName} onChange={e=>setDisplayName(e.target.value)} />
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@studio.com"
                value={email} onChange={e=>setEmail(e.target.value)} />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <input className="auth-input" type={showPwd?"text":"password"}
                  placeholder="At least 8 characters"
                  value={pwd} onChange={e=>setPwd(e.target.value)} />
                <button className="eye-btn" onClick={()=>setShowPwd(p=>!p)}>{showPwd?"🙈":"👁️"}</button>
              </div>
              {pwd && (
                <div className="pwd-strength">
                  <div className="pwd-strength-bar">
                    <div className="pwd-strength-fill" style={{width:strength.w, background:strength.color}} />
                  </div>
                  <div className="pwd-strength-label" style={{color:strength.color}}>{strength.label}</div>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <input className={`auth-input ${pwdMismatch?"error":""}`}
                  type={showConfirm?"text":"password"}
                  placeholder="Repeat your password"
                  value={confirmPwd} onChange={e=>{ setConfirmPwd(e.target.value); setPwdMismatch(false); }} />
                <button className="eye-btn" onClick={()=>setShowConfirm(p=>!p)}>{showConfirm?"🙈":"👁️"}</button>
              </div>
              {pwdMismatch && <div className="field-error">⚠ Passwords don't match</div>}
            </div>

            {authError && <div className="field-error" style={{marginBottom:8}}>⚠ {authError}</div>}

            <button className="auth-btn" style={{marginTop:8}}
              disabled={!displayName||!email||!pwd||!confirmPwd||loading}
              onClick={handleSignUp}>
              {loading ? "Creating account…" : "Create Account"}
            </button>

            <div className="terms-text">
              By signing up you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>
            </div>

            <div className="auth-footer">
              Already have an account?{" "}
              <button className="auth-link" onClick={()=>setScreen("signin")}>Sign in</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── MAGIC LINK ──────────────────────────────────────────────
  if (screen === "magic") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-top-bar">
          <button className="back-btn" onClick={()=>setScreen("splash")}>←</button>
        </div>
        <div className="auth-scroll">
          <div className="auth-screen">
            <div className="auth-logo-row">
              <img src={LOGO} className="auth-logo-img" alt="" />
              <span className="auth-logo-text">Hot—<em>Pots</em></span>
            </div>
            <div className="auth-heading">Magic link</div>
            <div className="auth-subheading">Enter your email and we'll send you a one-tap sign-in link. No password needed.</div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@studio.com"
                value={email} onChange={e=>setEmail(e.target.value)} />
            </div>

            {authError && <div className="field-error" style={{marginBottom:8}}>⚠ {authError}</div>}

            <button className="auth-btn" style={{marginTop:20}}
              disabled={!email||loading}
              onClick={handleMagicLink}>
              {loading ? "Sending…" : "Send Magic Link ✨"}
            </button>

            <div className="auth-footer" style={{marginTop:20}}>
              Prefer a password?{" "}
              <button className="auth-link" onClick={()=>setScreen("signin")}>Sign in</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── CHECK EMAIL ─────────────────────────────────────────────
  if (screen === "checkemail") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-scroll">
          <div className="auth-screen" style={{paddingTop:60, alignItems:"center", textAlign:"center"}}>
            <div className="auth-info-box" style={{width:"100%"}}>
              <div className="auth-info-icon">📬</div>
              <div className="auth-info-title">Check your inbox</div>
              <div className="auth-info-text">
                We sent a link to <strong>{email || "your email"}</strong>.<br/><br/>
                Click the link in the email to {screen==="checkemail" && pwd ? "confirm your account" : "sign in"}. It expires in 10 minutes.
              </div>
            </div>

            <div style={{fontSize:13, color:"#92400E", marginBottom:20, lineHeight:1.6}}>
              Didn't get it? Check your spam folder, or{" "}
              <button className="auth-link" onClick={()=>setScreen(pwd?"signup":"magic")}>try again</button>.
            </div>

            <button className="auth-btn-ghost" style={{width:"100%"}} onClick={()=>setScreen("splash")}>
              Back to Start
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── FORGOT PASSWORD ─────────────────────────────────────────
  if (screen === "forgot") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-top-bar">
          <button className="back-btn" onClick={()=>setScreen("signin")}>←</button>
        </div>
        <div className="auth-scroll">
          <div className="auth-screen">
            <div className="auth-logo-row">
              <img src={LOGO} className="auth-logo-img" alt="" />
              <span className="auth-logo-text">Hot—<em>Pots</em></span>
            </div>
            <div className="auth-heading">Reset password</div>
            <div className="auth-subheading">Enter your email and we'll send you a link to reset your password.</div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@studio.com"
                value={email} onChange={e=>setEmail(e.target.value)} />
            </div>

            {authError && <div className="field-error" style={{marginBottom:8}}>⚠ {authError}</div>}

            <button className="auth-btn" style={{marginTop:20}}
              disabled={!email||loading}
              onClick={handleForgotPassword}>
              {loading ? "Sending…" : "Send Reset Link"}
            </button>

            <div className="auth-footer">
              Remembered it?{" "}
              <button className="auth-link" onClick={()=>setScreen("signin")}>Back to sign in</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── NEW PASSWORD ────────────────────────────────────────────
  if (screen === "newpwd") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-scroll">
          <div className="auth-screen" style={{paddingTop:40}}>
            <div className="auth-logo-row">
              <img src={LOGO} className="auth-logo-img" alt="" />
              <span className="auth-logo-text">Hot—<em>Pots</em></span>
            </div>
            <div className="auth-heading">New password</div>
            <div className="auth-subheading">Choose a strong new password for your account.</div>

            <div className="auth-field">
              <label className="auth-label">New Password</label>
              <div className="auth-input-wrap">
                <input className="auth-input" type={showPwd?"text":"password"}
                  placeholder="At least 8 characters"
                  value={pwd} onChange={e=>setPwd(e.target.value)} />
                <button className="eye-btn" onClick={()=>setShowPwd(p=>!p)}>{showPwd?"🙈":"👁️"}</button>
              </div>
              {pwd && (
                <div className="pwd-strength">
                  <div className="pwd-strength-bar">
                    <div className="pwd-strength-fill" style={{width:strength.w, background:strength.color}} />
                  </div>
                  <div className="pwd-strength-label" style={{color:strength.color}}>{strength.label}</div>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm New Password</label>
              <div className="auth-input-wrap">
                <input className={`auth-input ${pwdMismatch?"error":""}`}
                  type={showConfirm?"text":"password"} placeholder="Repeat your password"
                  value={confirmPwd} onChange={e=>{ setConfirmPwd(e.target.value); setPwdMismatch(false); }} />
                <button className="eye-btn" onClick={()=>setShowConfirm(p=>!p)}>{showConfirm?"🙈":"👁️"}</button>
              </div>
              {pwdMismatch && <div className="field-error">⚠ Passwords don't match</div>}
            </div>

            {authError && <div className="field-error" style={{marginBottom:8}}>⚠ {authError}</div>}

            <button className="auth-btn" style={{marginTop:8}}
              disabled={!pwd||!confirmPwd||loading||strength.score<2}
              onClick={handleNewPassword}>
              {loading ? "Saving…" : "Set New Password"}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── ONBOARDING STEP 1 — profile ─────────────────────────────
  if (screen === "onboard1") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-scroll">
          <div className="auth-screen" style={{paddingTop:32}}>
            <div className="onboard-progress">
              <div className="onboard-dot active" />
              <div className="onboard-dot" />
            </div>

            <div className="auth-heading">Set up your profile</div>
            <div className="auth-subheading">Tell the studio a bit about yourself and your pottery.</div>

            <div className="avatar-pick">
              <div className="avatar-circle">{initials}</div>
              <div className="avatar-pick-label">Tap to upload a photo</div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Display Name</label>
              <input className="auth-input" type="text" placeholder="How you'll appear to other members"
                value={displayName} onChange={e=>setDisplayName(e.target.value)} />
            </div>

            <div className="auth-field">
              <label className="auth-label">About your pottery <span style={{fontWeight:400, color:"#B45309"}}>(optional)</span></label>
              <textarea className="auth-input" rows={3} placeholder="e.g. Wheel thrower obsessed with wood-fire glazes…"
                style={{resize:"none", lineHeight:1.5}}
                value={bio} onChange={e=>setBio(e.target.value)} />
            </div>

            <button className="auth-btn" disabled={!displayName}
              onClick={()=>setScreen("onboard2")}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── ONBOARDING STEP 2 — studio code ─────────────────────────
  if (screen === "onboard2") return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-top-bar">
          <button className="back-btn" onClick={()=>setScreen("onboard1")}>←</button>
        </div>
        <div className="auth-scroll">
          <div className="auth-screen">
            <div className="onboard-progress">
              <div className="onboard-dot done" />
              <div className="onboard-dot active" />
            </div>

            <div className="auth-heading">Studio access</div>
            <div className="auth-subheading">Enter the invite code your studio admin shared with you. This keeps Hot—Pots members-only.</div>

            <div className="auth-field">
              <label className="auth-label">Studio Invite Code</label>
              <div className="studio-code-row">
                <input className="auth-input" type="text" maxLength={6}
                  placeholder="_ _ _ _ _ _" style={{textTransform:"uppercase"}}
                  value={inviteCode} onChange={e=>{ setInviteCode(e.target.value.toUpperCase()); clearError(); }} />
              </div>
            </div>

            <div style={{background:"#FEF3C7", borderRadius:14, padding:"13px 16px", marginBottom:20, fontSize:12, color:"#92400E", lineHeight:1.6, border:"1px solid #D9770630"}}>
              🏺 Don't have a code? Ask your studio admin — they can generate one from the admin dashboard.
            </div>

            {authError && <div className="field-error" style={{marginBottom:8}}>⚠ {authError}</div>}

            <button className="auth-btn" disabled={loading}
              onClick={()=>handleInviteCode(inviteCode)}>
              {loading ? "Verifying…" : "Join the Studio 🏺"}
            </button>

            <button className="auth-btn-ghost" disabled={loading}
              onClick={()=>onAuthComplete?.()}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── NAV DEMO — screen picker ────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="auth-shell">
        <div className="auth-scroll">
          <div className="auth-screen" style={{paddingTop:40}}>
            <div className="auth-logo-row"><img src={LOGO} className="auth-logo-img" alt="" /><span className="auth-logo-text">Hot—<em>Pots</em></span></div>
            <div className="auth-heading">Auth Screens</div>
            <div className="auth-subheading">Pick a screen to preview:</div>
            {["splash","signin","signup","magic","checkemail","forgot","newpwd","onboard1","onboard2"].map(s=>(
              <button key={s} className="auth-btn-ghost" style={{marginTop:8, textTransform:"capitalize"}} onClick={()=>setScreen(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
