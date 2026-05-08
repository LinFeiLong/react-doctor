import { TransitionSeries } from "@remotion/transitions";
import {
  SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES,
  SCENE_FILE_SCAN_DURATION_FRAMES,
  SCENE_SCORE_REVEAL_DURATION_FRAMES,
  SCENE_TYPING_DURATION_FRAMES,
} from "../constants";
import { DiagnoseAndFix } from "../scenes/diagnose-and-fix";
import { FileScan } from "../scenes/file-scan";
import { ScoreReveal } from "../scenes/score-reveal";
import { TerminalTyping } from "../scenes/terminal-typing";

export const Main = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_TYPING_DURATION_FRAMES}>
        <TerminalTyping />
      </TransitionSeries.Sequence>

      <TransitionSeries.Sequence durationInFrames={SCENE_FILE_SCAN_DURATION_FRAMES}>
        <FileScan />
      </TransitionSeries.Sequence>

      <TransitionSeries.Sequence durationInFrames={SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES}>
        <DiagnoseAndFix />
      </TransitionSeries.Sequence>

      <TransitionSeries.Sequence durationInFrames={SCENE_SCORE_REVEAL_DURATION_FRAMES}>
        <ScoreReveal />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
