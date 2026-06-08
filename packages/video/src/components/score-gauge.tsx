import {
  GH_FONT_FAMILY,
  GH_TEXT_COLOR,
  SCORE_OVERALL_FONT_SIZE_PX,
  SCORE_RING_SIZE_PX,
  SCORE_RING_STROKE_PX,
  SCORE_RING_TRACK_COLOR,
} from "../constants";

interface ScoreGaugeProps {
  overallScore: number;
  overallFill: number;
  ringColor: string;
}

const RADIUS_PX = (SCORE_RING_SIZE_PX - SCORE_RING_STROKE_PX) / 2;
const CENTER_PX = SCORE_RING_SIZE_PX / 2;
const CIRCUMFERENCE_PX = 2 * Math.PI * RADIUS_PX;

export const ScoreGauge = ({ overallScore, overallFill, ringColor }: ScoreGaugeProps) => (
  <div style={{ position: "relative", width: SCORE_RING_SIZE_PX, height: SCORE_RING_SIZE_PX, flexShrink: 0 }}>
    <svg
      width={SCORE_RING_SIZE_PX}
      height={SCORE_RING_SIZE_PX}
      viewBox={`0 0 ${SCORE_RING_SIZE_PX} ${SCORE_RING_SIZE_PX}`}
      aria-hidden="true"
    >
      <circle
        cx={CENTER_PX}
        cy={CENTER_PX}
        r={RADIUS_PX}
        fill="none"
        stroke={SCORE_RING_TRACK_COLOR}
        strokeWidth={SCORE_RING_STROKE_PX}
      />
        <circle
          cx={CENTER_PX}
          cy={CENTER_PX}
          r={RADIUS_PX}
          fill="none"
          stroke={ringColor}
          strokeWidth={SCORE_RING_STROKE_PX}
          strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE_PX}
        strokeDashoffset={CIRCUMFERENCE_PX * (1 - overallFill)}
        transform={`rotate(-90 ${CENTER_PX} ${CENTER_PX})`}
      />
    </svg>
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontFamily: GH_FONT_FAMILY, fontWeight: 700, fontSize: SCORE_OVERALL_FONT_SIZE_PX, color: GH_TEXT_COLOR, lineHeight: 1 }}>
        {overallScore}
      </span>
    </div>
  </div>
);
