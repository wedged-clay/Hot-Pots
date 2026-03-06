import { Component } from "react";

// ── Styles ────────────────────────────────────────────────────
const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "#FDF0E0",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    background: "white",
    borderRadius: "24px",
    padding: "36px 28px",
    maxWidth: "380px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(68,32,10,0.08)",
    border: "1px solid #D9770620",
  },
  emoji: { fontSize: "52px", marginBottom: "16px", lineHeight: 1 },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "22px",
    color: "#44200A",
    marginBottom: "10px",
  },
  body: {
    fontSize: "14px",
    color: "#7C2D12",
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  btn: {
    display: "inline-block",
    padding: "12px 28px",
    borderRadius: "14px",
    border: "none",
    background: "#E8450A",
    color: "white",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "12px",
    width: "100%",
  },
  detail: {
    marginTop: "20px",
    padding: "12px",
    borderRadius: "10px",
    background: "#FEF3C7",
    fontSize: "11px",
    color: "#92400E",
    textAlign: "left",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    maxHeight: "120px",
    overflowY: "auto",
  },
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, showDetail: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Log to console for devs; swap for Sentry.captureException(error) when ready
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null, info: null, showDetail: false });
    // If the boundary wraps a single tab, resetting state is enough.
    // If it wraps the whole app, a full reload is safer.
    if (this.props.fullPage) window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { label = "this section" } = this.props;

    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.emoji}>🏺</div>
          <div style={styles.heading}>Something cracked</div>
          <div style={styles.body}>
            An unexpected error occurred in {label}. Your data is safe — this is just a display problem.
          </div>

          <button style={styles.btn} onClick={this.handleReset}>
            {this.props.fullPage ? "Reload app" : "Try again"}
          </button>

          <button
            onClick={() => this.setState(s => ({ showDetail: !s.showDetail }))}
            style={{
              background: "none", border: "none", fontSize: "12px",
              color: "#92400E", cursor: "pointer", textDecoration: "underline",
            }}>
            {this.state.showDetail ? "Hide" : "Show"} error detail
          </button>

          {this.state.showDetail && (
            <div style={styles.detail}>
              {this.state.error?.message}
              {"\n\n"}
              {this.state.info?.componentStack?.trim()}
            </div>
          )}
        </div>
      </div>
    );
  }
}
