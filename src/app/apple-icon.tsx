import { ImageResponse } from "next/og";

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
          background: "#F8F6F1",
          borderRadius: 40,
          border: "5px solid #2E7D7A",
        }}
      >
        <div
          style={{
            fontSize: 78,
            color: "#2E7D7A",
            fontFamily: "serif",
            marginTop: 4,
          }}
        >
          숨
        </div>
      </div>
    ),
    { ...size },
  );
}
