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
          background: "#0f172a",
        }}
      >
        <svg width="96" height="96" viewBox="0 0 24 24" fill="#ffc700">
          <path d="M13 2 4.5 14H11l-1 8 9.5-13H13z" />
        </svg>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
