import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "#F8F6F1",
          borderRadius: 112,
          border: "14px solid #2E7D7A",
        }}
      >
        <div
          style={{
            fontSize: 220,
            color: "#2E7D7A",
            fontFamily: "serif",
            marginTop: 8,
          }}
        >
          숨
        </div>
      </div>
    ),
    { ...size },
  );
}
