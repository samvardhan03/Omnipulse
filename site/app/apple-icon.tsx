import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1B1B1F",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            color: "#C0401E",
            fontSize: 120,
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          Ω
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
