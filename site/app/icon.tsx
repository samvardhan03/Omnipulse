import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 4,
        }}
      >
        <span
          style={{
            color: "#C0401E",
            fontSize: 22,
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          Ω
        </span>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
