export const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #FDF0E0;
    color: #44200A;
    min-height: 100vh;
  }

  .app {
    max-width: 420px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #FDF0E0;
    position: relative;
  }

  .app::before {
    content: '';
    position: fixed;
    top: -80px; right: -80px;
    width: 300px; height: 300px;
    border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
    background: radial-gradient(ellipse, #E8450A28, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .app::after {
    content: '';
    position: fixed;
    bottom: 60px; left: -60px;
    width: 240px; height: 240px;
    border-radius: 40% 60% 30% 70% / 60% 40% 70% 30%;
    background: radial-gradient(ellipse, #D9770620, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  /* ── HEADER ── */
  .header {
    padding: 18px 22px 14px;
    display: flex; align-items: center; justify-content: space-between;
    position: relative; z-index: 10;
  }
  .wordmark {
    display: flex; align-items: center; gap: 8px;
  }
  .wordmark img { width: 30px; height: 30px; object-fit: contain; }
  .wordmark-text {
    font-family: 'Playfair Display', serif;
    font-size: 21px; font-weight: 700;
    color: #44200A; letter-spacing: -0.3px;
  }
  .wordmark-text em {
    font-style: italic; color: #E8450A;
  }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 12px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: transform 0.2s;
  }
  .avatar:hover { transform: scale(1.08); }

  /* ── TABS ── */
  .tabs {
    display: flex; padding: 0 22px; gap: 2px;
    border-bottom: 1.5px solid #D9770644;
    position: relative; z-index: 10;
    overflow-x: auto; scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    padding: 9px 12px;
    font-size: 12px; font-weight: 500;
    color: #92400E; cursor: pointer;
    border: none; background: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1.5px;
    transition: all 0.18s; white-space: nowrap; flex-shrink: 0;
  }
  .tab.active { color: #E8450A; border-bottom-color: #E8450A; font-weight: 600; }
  .tab:hover:not(.active) { color: #44200A; }

  /* ── CONTENT ── */
  .content {
    flex: 1; overflow-y: auto;
    padding: 0 22px 90px;
    position: relative; z-index: 10;
  }

  /* ── ROUND BANNER ── */
  .round-banner {
    margin: 18px 0 0;
    background: linear-gradient(140deg, #7C2D12 0%, #44200A 100%);
    border-radius: 20px; padding: 22px;
    color: white; position: relative; overflow: hidden;
  }
  .round-banner::before {
    content: '🏺';
    position: absolute; right: 16px; top: 50%;
    transform: translateY(-50%);
    font-size: 60px; opacity: 0.12;
  }
  .round-status {
    display: inline-block;
    background: #E8450A; color: white;
    font-size: 10px; font-weight: 600;
    padding: 3px 10px; border-radius: 20px;
    letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px;
  }
  .round-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px; margin-bottom: 5px; line-height: 1.2;
  }
  .round-meta { font-size: 12px; opacity: 0.65; margin-bottom: 14px; }
  .round-progress {
    background: rgba(255,255,255,0.15); border-radius: 20px;
    height: 5px; margin-bottom: 5px; overflow: hidden;
  }
  .round-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #E8450A, #D97706);
    border-radius: 20px;
  }
  .round-progress-label { font-size: 11px; opacity: 0.6; }

  /* ── BUTTONS ── */
  .btn-primary {
    display: block; width: 100%; margin-top: 16px;
    padding: 13px;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; border: none; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600; cursor: pointer;
    letter-spacing: 0.2px;
    transition: all 0.2s;
    box-shadow: 0 4px 14px #E8450A44;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #E8450A55; }
  .btn-primary:active { transform: translateY(0); }

  .btn-secondary {
    display: block; width: 100%; padding: 12px;
    background: transparent; color: #E8450A;
    border: 1.5px solid #E8450A; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 500; cursor: pointer;
    transition: all 0.2s; margin-top: 10px;
  }
  .btn-secondary:hover { background: #E8450A0f; }

  .btn-coffee {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; width: 100%; padding: 13px;
    background: linear-gradient(135deg, #D97706, #B45309);
    color: white; border: none; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 14px #D9770640;
    text-decoration: none;
  }
  .btn-coffee:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #D9770655; }

  /* ── SECTIONS ── */
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin: 26px 0 12px;
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px; color: #44200A;
  }
  .section-link { font-size: 12px; color: #E8450A; cursor: pointer; }

  /* ── HOW IT WORKS ── */
  .how-card {
    background: white; border-radius: 18px; padding: 18px;
    margin-bottom: 12px; border: 1px solid #D9770630;
  }
  .step { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 15px; }
  .step:last-child { margin-bottom: 0; }
  .step-num {
    width: 26px; height: 26px; border-radius: 50%;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .step-title { font-size: 13px; font-weight: 600; color: #44200A; margin-bottom: 3px; }
  .step-desc { font-size: 12px; color: #92400E; line-height: 1.55; }

  /* ── MATCH CARDS ── */
  .match-card {
    background: white; border-radius: 16px; padding: 15px;
    margin-bottom: 10px; border: 1px solid #D9770630;
    display: flex; align-items: center; gap: 12px;
    cursor: pointer; transition: all 0.2s;
  }
  .match-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #44200A10; }
  .match-emoji {
    width: 46px; height: 46px; background: #FEF3C7;
    border-radius: 12px; display: flex; align-items: center;
    justify-content: center; font-size: 22px; flex-shrink: 0;
  }
  .match-info { flex: 1; min-width: 0; }
  .match-round { font-size: 11px; color: #92400E; margin-bottom: 3px; }
  .match-pieces { font-size: 13px; font-weight: 500; color: #44200A; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .match-partner { font-size: 12px; color: #92400E; }
  .match-type-badge {
    font-size: 10px; padding: 3px 8px; border-radius: 20px; flex-shrink: 0; font-weight: 500;
  }
  .badge-random { background: #FEF3C7; color: #B45309; }
  .badge-choice { background: #FDE8D8; color: #C1440E; }

  /* ── GALLERY / RANKING ── */
  .gallery-intro {
    background: linear-gradient(120deg, #7C2D12, #44200A);
    border-radius: 16px; padding: 16px; margin-bottom: 14px; color: white;
  }
  .gallery-intro-title { font-family: 'Playfair Display', serif; font-size: 15px; margin-bottom: 5px; }
  .gallery-intro-text { font-size: 12px; opacity: 0.75; line-height: 1.5; }

  /* Unranked pool — 2-col grid */
  .gallery-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gallery-card {
    background: white; border-radius: 16px; padding: 14px;
    border: 2px solid #D9770630; cursor: pointer;
    transition: all 0.18s; position: relative;
  }
  .gallery-card:hover { transform: translateY(-2px); box-shadow: 0 5px 14px #44200A10; border-color: #E8450A66; }
  .gallery-emoji { font-size: 30px; margin-bottom: 8px; display: block; }
  .gallery-name { font-size: 12px; font-weight: 600; color: #44200A; margin-bottom: 2px; line-height: 1.3; }
  .gallery-maker { font-size: 11px; color: #92400E; margin-bottom: 4px; }
  .gallery-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .gallery-tag { font-size: 10px; padding: 2px 7px; border-radius: 10px; background: #FEF3C7; color: #B45309; }
  .add-rank-btn {
    margin-top: 10px; width: 100%; padding: 6px;
    background: #E8450A12; color: #E8450A; border: 1.5px dashed #E8450A55;
    border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.18s;
  }
  .add-rank-btn:hover { background: #E8450A22; border-color: #E8450A; }

  /* Ranked list — full-width rows */
  .rank-list { margin-bottom: 14px; }
  .rank-row {
    background: white; border-radius: 14px; padding: 12px 14px;
    margin-bottom: 8px; border: 2px solid #E8450A33;
    display: flex; align-items: center; gap: 12px;
    transition: all 0.18s;
  }
  .rank-row:hover { border-color: #E8450A77; box-shadow: 0 3px 10px #E8450A12; }
  .rank-badge {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .rank-badge.rank-1 { background: linear-gradient(135deg, #D97706, #B45309); }
  .rank-badge.rank-2 { background: linear-gradient(135deg, #92400E, #7C2D12); }
  .rank-info { flex: 1; min-width: 0; }
  .rank-name { font-size: 13px; font-weight: 600; color: #44200A; margin-bottom: 1px; }
  .rank-sub { font-size: 11px; color: #92400E; }
  .rank-emoji { font-size: 22px; flex-shrink: 0; }
  .rank-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .rank-btn {
    width: 26px; height: 26px; border-radius: 8px;
    background: #FEF3C7; color: #B45309; border: none;
    font-size: 13px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; transition: all 0.15s;
  }
  .rank-btn:hover { background: #FDE8D8; color: #E8450A; }
  .rank-btn.remove { background: #FDE8D8; color: #C1440E; }
  .rank-btn.remove:hover { background: #E8450A; color: white; }

  .rank-summary {
    background: #FEF3C7; border-radius: 14px; padding: 12px 14px;
    margin-bottom: 14px; display: flex; align-items: center; gap: 10px;
    border: 1px solid #D9770640;
  }
  .rank-summary-icon { font-size: 20px; }
  .rank-summary-text { font-size: 12px; color: #92400E; line-height: 1.5; }
  .rank-summary-count { font-weight: 700; color: #E8450A; }

  /* ── MESSAGES ── */
  .convo-list { padding-top: 16px; }
  .convo-card {
    background: white; border-radius: 16px; padding: 15px;
    margin-bottom: 10px; border: 1px solid #D9770630;
    display: flex; align-items: center; gap: 12px;
    cursor: pointer; transition: all 0.18s;
  }
  .convo-card:hover { transform: translateY(-2px); box-shadow: 0 5px 16px #44200A0f; }
  .convo-card.unread { border-color: #E8450A44; background: #FFF8F5; }
  .convo-avatar {
    width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .convo-info { flex: 1; min-width: 0; }
  .convo-name { font-size: 14px; font-weight: 600; color: #44200A; margin-bottom: 2px; }
  .convo-preview { font-size: 12px; color: #92400E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .convo-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
  .convo-time { font-size: 11px; color: #92400E; }
  .convo-unread-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #E8450A;
  }
  .convo-expires {
    font-size: 10px; padding: 2px 8px; border-radius: 20px;
    background: #FEF3C7; color: #B45309; font-weight: 500;
  }
  .convo-expires.urgent { background: #FDE8D8; color: #C1440E; }

  /* Thread view */
  .thread-header {
    background: white; border-bottom: 1px solid #D9770630;
    padding: 14px 22px; display: flex; align-items: center; gap: 12px;
    position: sticky; top: 0; z-index: 20;
  }
  .thread-back {
    background: none; border: none; font-size: 18px; cursor: pointer;
    color: #E8450A; padding: 2px 6px 2px 0; flex-shrink: 0;
  }
  .thread-avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .thread-info { flex: 1; min-width: 0; }
  .thread-name { font-size: 14px; font-weight: 600; color: #44200A; }
  .thread-sub { font-size: 11px; color: #92400E; }

  .thread-expiry-banner {
    margin: 12px 0 4px; padding: 9px 14px; border-radius: 12px;
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; line-height: 1.4;
  }
  .thread-expiry-banner.ok { background: #FEF3C7; color: #92400E; border: 1px solid #D9770630; }
  .thread-expiry-banner.urgent { background: #FDE8D8; color: #C1440E; border: 1px solid #E8450A30; }

  .messages-scroll { padding: 4px 0 12px; }
  .msg-row { display: flex; margin-bottom: 10px; }
  .msg-row.me { justify-content: flex-end; }
  .msg-row.them { justify-content: flex-start; }
  .msg-bubble {
    max-width: 78%; padding: 10px 14px; border-radius: 18px;
    font-size: 13px; line-height: 1.5;
  }
  .msg-row.me .msg-bubble {
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; border-bottom-right-radius: 5px;
  }
  .msg-row.them .msg-bubble {
    background: white; color: #44200A;
    border: 1px solid #D9770630; border-bottom-left-radius: 5px;
  }
  .msg-time { font-size: 10px; margin-top: 3px; color: #92400E; }
  .msg-row.me .msg-time { text-align: right; }

  .msg-date-divider {
    text-align: center; font-size: 11px; color: #92400E;
    margin: 10px 0 8px; font-weight: 500;
  }

  .msg-swap-card {
    background: #FEF3C7; border-radius: 14px; padding: 12px 14px;
    margin: 0 0 16px; border: 1px solid #D9770640;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .msg-swap-icon { font-size: 20px; flex-shrink: 0; }
  .msg-swap-title { font-size: 12px; font-weight: 600; color: #44200A; margin-bottom: 2px; }
  .msg-swap-sub { font-size: 11px; color: #92400E; }

  .compose-bar {
    position: sticky; bottom: 0;
    background: rgba(253,240,224,0.96); backdrop-filter: blur(10px);
    border-top: 1px solid #D9770630;
    padding: 10px 22px 24px;
    display: flex; gap: 10px; align-items: flex-end;
  }
  .compose-input {
    flex: 1; padding: 10px 14px; border-radius: 22px;
    border: 1.5px solid #D9770650; background: white;
    font-family: 'DM Sans', sans-serif; font-size: 13px; color: #44200A;
    outline: none; resize: none; line-height: 1.4; max-height: 100px;
    transition: border-color 0.2s;
  }
  .compose-input:focus { border-color: #E8450A; }
  .compose-send {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; border: none; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.18s; box-shadow: 0 3px 10px #E8450A44;
  }
  .compose-send:hover { transform: scale(1.08); }
  .compose-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .expired-notice {
    text-align: center; padding: 16px; background: #FDE8D8;
    border-radius: 14px; margin: 8px 0;
    font-size: 12px; color: #C1440E; line-height: 1.6;
  }

  /* ── SUBMIT FORM ── */
  .form-intro {
    background: #FEF3C7; border-radius: 16px; padding: 16px;
    margin-bottom: 20px; border-left: 3px solid #E8450A;
  }
  .form-intro-title { font-family: 'Playfair Display', serif; font-size: 15px; margin-bottom: 5px; }
  .form-intro-text { font-size: 12px; color: #92400E; line-height: 1.6; }

  .piece-section {
    background: white; border-radius: 18px; padding: 18px;
    margin-bottom: 12px; border: 1px solid #D9770630;
  }
  .piece-label {
    font-size: 11px; font-weight: 700; color: #E8450A;
    text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .piece-type-pill {
    font-size: 10px; padding: 2px 8px; border-radius: 20px;
    background: #FEF3C7; color: #B45309; font-weight: 600; letter-spacing: 0;
    text-transform: none;
  }

  .photo-upload {
    width: 100%; height: 110px;
    border: 2px dashed #D9770660; border-radius: 14px;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 6px; cursor: pointer;
    margin-bottom: 14px; background: #FEF3C7;
    transition: all 0.2s;
  }
  .photo-upload:hover { border-color: #E8450A; background: #E8450A08; }
  .photo-upload-icon { font-size: 26px; }
  .photo-upload-text { font-size: 12px; color: #92400E; }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .form-field { margin-bottom: 10px; }
  .form-label { display: block; font-size: 12px; font-weight: 500; color: #92400E; margin-bottom: 5px; }
  .form-input {
    width: 100%; padding: 10px 13px;
    border: 1.5px solid #D9770650; border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    color: #44200A; background: #FDF0E0; outline: none;
    transition: border-color 0.2s; appearance: none;
  }
  .form-input:focus { border-color: #E8450A; }
  .form-textarea { resize: none; height: 68px; }
  select.form-input { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23E8450A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }

  /* ── DONATE ── */
  .donate-hero {
    background: linear-gradient(140deg, #44200A, #7C2D12);
    border-radius: 20px; padding: 24px; color: white;
    text-align: center; margin-top: 20px; margin-bottom: 16px;
    position: relative; overflow: hidden;
  }
  .donate-hero::before {
    content: '☕'; position: absolute; font-size: 80px; opacity: 0.08;
    bottom: -10px; right: 10px;
  }
  .donate-hero-icon { font-size: 38px; margin-bottom: 10px; }
  .donate-hero-title { font-family: 'Playfair Display', serif; font-size: 20px; margin-bottom: 8px; }
  .donate-hero-text { font-size: 13px; opacity: 0.8; line-height: 1.6; margin-bottom: 20px; }
  .donate-amounts { display: flex; gap: 8px; justify-content: center; margin-bottom: 18px; }
  .donate-amount {
    padding: 8px 16px; border-radius: 20px;
    background: rgba(255,255,255,0.12); color: white;
    font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1.5px solid rgba(255,255,255,0.2); transition: all 0.2s;
  }
  .donate-amount.selected { background: #E8450A; border-color: #E8450A; }
  .donate-amount:hover:not(.selected) { background: rgba(255,255,255,0.2); }

  .donate-note {
    background: #FEF3C7; border-radius: 14px; padding: 14px;
    margin-top: 14px; display: flex; gap: 10px; align-items: flex-start;
    border: 1px solid #D9770630;
  }
  .donate-note-icon { font-size: 18px; flex-shrink: 0; }
  .donate-note-text { font-size: 12px; color: #92400E; line-height: 1.6; }
  .donate-note-title { font-size: 13px; font-weight: 600; color: #44200A; margin-bottom: 3px; }

  /* ── PROFILE ── */
  .profile-header { padding-top: 24px; text-align: center; margin-bottom: 20px; }
  .profile-avatar {
    width: 68px; height: 68px; border-radius: 50%;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 22px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
  }
  .profile-name { font-family: 'Playfair Display', serif; font-size: 21px; margin-bottom: 3px; }
  .profile-stats { display: flex; gap: 20px; justify-content: center; margin-top: 18px; }
  .stat { text-align: center; }
  .stat-num { font-family: 'Playfair Display', serif; font-size: 24px; color: #E8450A; }
  .stat-label { font-size: 11px; color: #92400E; margin-top: 2px; }

  /* ── BOTTOM NAV ── */
  .bottom-nav {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 420px;
    background: rgba(253,240,224,0.94); backdrop-filter: blur(12px);
    border-top: 1px solid #D9770640;
    padding: 10px 0 20px;
    display: flex; justify-content: space-around; z-index: 100;
  }
  .nav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: none; border: none; cursor: pointer;
    padding: 4px 18px; transition: all 0.2s;
  }
  .nav-icon { font-size: 20px; transition: transform 0.2s; }
  .nav-btn:active .nav-icon { transform: scale(0.88); }
  .nav-label { font-size: 10px; font-weight: 500; color: #92400E; transition: color 0.2s; }
  .nav-btn.active .nav-label { color: #E8450A; font-weight: 700; }
`;
