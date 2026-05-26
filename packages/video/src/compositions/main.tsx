import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import {
  SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES,
  SCENE_SCORE_REVEAL_DURATION_FRAMES,
  SCENE_TYPING_DURATION_FRAMES,
} from "../constants";
import { DiagnoseAndFix } from "../scenes/diagnose-and-fix";
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

      <TransitionSeries.Sequence durationInFrames={SCENE_TYPING_DURATION_FRAMES}>
        <TerminalTyping />
      </TransitionSeries.Sequence>

    </TransitionSeries>
  );
};
