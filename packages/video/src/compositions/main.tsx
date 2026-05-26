import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { springTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import {
  SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES,
  SCENE_FILE_SCAN_DURATION_FRAMES,
  SCENE_SCORE_REVEAL_DURATION_FRAMES,
  SCENE_TYPING_DURATION_FRAMES,
  TRANSITION_DURATION_FRAMES,
} from "../constants";
import { DiagnoseAndFix } from "../scenes/diagnose-and-fix";
import { FileScan } from "../scenes/file-scan";
import { ScoreReveal } from "../scenes/score-reveal";
import { TerminalTyping } from "../scenes/terminal-typing";
import { waitUntilDone } from "../utils/font";

export const Main = () => {
  const [handle] = useState(() => delayRender("Loading font"));

  useEffect(() => {
    waitUntilDone().then(() => continueRender(handle));
  }, [handle]);
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES}>
        <DiagnoseAndFix />
      </TransitionSeries.Sequence>

      <TransitionSeries.Sequence durationInFrames={SCENE_SCORE_REVEAL_DURATION_FRAMES}>
        <ScoreReveal />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION_FRAMES,
        })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_TYPING_DURATION_FRAMES}>
        <TerminalTyping />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION_FRAMES,
        })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_FILE_SCAN_DURATION_FRAMES}>
        <FileScan />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
