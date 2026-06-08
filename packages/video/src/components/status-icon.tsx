import {
  FAIL_RED_COLOR,
  GH_CHECK_MARK_COLOR,
  GH_PENDING_AMBER_COLOR,
  GH_SUCCESS_GREEN_COLOR,
  GH_SUCCESS_RING_COLOR,
} from "../constants";
import type { CheckState } from "../types";

interface StatusIconProps {
  state: CheckState;
  sizePx: number;
  spinnerRotationDeg: number;
  popScale?: number;
}

export const StatusIcon = ({ state, sizePx, spinnerRotationDeg, popScale = 1 }: StatusIconProps) => {
  if (state === "pending") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: sizePx, height: sizePx, flexShrink: 0, transform: `rotate(${spinnerRotationDeg}deg)` }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke={GH_PENDING_AMBER_COLOR} strokeWidth={3} strokeOpacity={0.25} />
        <path d="M21 12a9 9 0 0 1-9 9" stroke={GH_PENDING_AMBER_COLOR} strokeWidth={3} strokeLinecap="round" />
      </svg>
    );
  }

  const isFail = state === "fail";

  return (
    <div
      style={{
        width: sizePx,
        height: sizePx,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        backgroundColor: isFail ? FAIL_RED_COLOR : GH_SUCCESS_GREEN_COLOR,
        border: `1px solid ${isFail ? "#b62324" : GH_SUCCESS_RING_COLOR}`,
        transform: `scale(${popScale})`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: sizePx * 0.56, height: sizePx * 0.56 }}
        aria-hidden="true"
      >
        {isFail ? (
          <path d="M7 7 L17 17 M17 7 L7 17" stroke={GH_CHECK_MARK_COLOR} strokeWidth={3} strokeLinecap="round" />
        ) : (
          <path d="M5 12 L10 17 L19 8" stroke={GH_CHECK_MARK_COLOR} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
};
