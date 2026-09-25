import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "How OmniPulse works: technical walkthrough";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1B1B1F",
          padding: "60px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#C0401E", fontSize: 32, lineHeight: 1 }}>Ω</span>
          <span style={{ color: "#FBF1E6", fontSize: 28, fontWeight: 300, letterSpacing: "-0.01em" }}>
            OmniPulse
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <span
            style={{
              color: "#FBF1E6",
              fontSize: 80,
              fontWeight: 300,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
            }}
          >
            How it works.
          </span>
          <span
            style={{
              color: "#4A4A52",
              fontSize: 28,
              fontWeight: 300,
              lineHeight: 1.4,
              marginTop: 16,
              fontFamily: "monospace",
              letterSpacing: "0.04em",
            }}
          >
            Two engines. One registry. One signed token.
          </span>
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ color: "#4A4A52", fontSize: 20, fontFamily: "monospace", letterSpacing: "0.04em" }}>
            omnipulseid.vercel.app
          </span>
          <span style={{ color: "#1B7A6E", fontSize: 14, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Technical walkthrough
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
