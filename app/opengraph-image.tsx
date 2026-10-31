import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Incoming holo call card from Agent, Jonathan Taft's AI agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SIGNAL_BARS = [24, 48, 72, 96];
const CARD = { width: 960, height: 490 };
const CUT = 72;
const BORDER = 3;

const rajdhani = await readFile(
  join(process.cwd(), "assets/fonts/Rajdhani-SemiBold.ttf"),
);

// An SVG panel, because Satori clips a clip-path element's background but not
// its children, which leaves the gradient filling the cut corner.
const PANEL_POINTS = [
  [BORDER, BORDER],
  [CARD.width - BORDER, BORDER],
  [CARD.width - BORDER, CARD.height - CUT],
  [CARD.width - CUT, CARD.height - BORDER],
  [BORDER, CARD.height - BORDER],
].join(" ");

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#07060c",
        fontFamily: "Rajdhani",
        fontWeight: 600,
      }}
    >
      <div style={{ display: "flex", position: "relative", ...CARD }}>
        <svg
          {...CARD}
          viewBox={`0 0 ${CARD.width} ${CARD.height}`}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#150d24" />
              <stop offset="1" stopColor="#071b24" />
            </linearGradient>
          </defs>
          <polygon
            points={PANEL_POINTS}
            fill="url(#panel)"
            stroke="#c9343f"
            strokeWidth={BORDER}
          />
        </svg>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            gap: 28,
            padding: "43px 59px 67px",
          }}
        >
          <div style={{ fontSize: 34, color: "#ff5a5f" }}>VELIN NETWORK</div>

          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 136,
                height: 136,
                borderRadius: "50%",
                border: "5px solid #6df5ea",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#6df5ea",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
              }}
            >
              <div style={{ fontSize: 38, color: "#86aeb0" }}>
                INCOMING HOLO CALL
              </div>
              <div style={{ fontSize: 104, lineHeight: 1, color: "#6df5ea" }}>
                AGENT
              </div>
              <div style={{ fontSize: 34, color: "#86aeb0" }}>
                JONATHAN TAFT&apos;S AI AGENT
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              {SIGNAL_BARS.map((height) => (
                <div
                  key={height}
                  style={{ width: 16, height, background: "#6df5ea" }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "14px 0",
              border: "3px solid #f7c766",
              fontSize: 48,
              color: "#f7c766",
            }}
          >
            ACCEPT
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Rajdhani", data: rajdhani, weight: 600, style: "normal" }],
    },
  );
}
