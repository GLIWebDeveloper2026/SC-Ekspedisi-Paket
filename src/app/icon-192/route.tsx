import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17191b",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "82%",
            height: "82%",
            borderRadius: "9999px",
            border: "6px solid #e8a33d",
            color: "#e8a33d",
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          KN
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
