import { AbsoluteFill } from "remotion";
import { springTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES,
  SCENE_FILE_SCAN_DURATION_FRAMES,
  SCENE_SCORE_REVEAL_DURATION_FRAMES,
  SCENE_TYPING_DURATION_FRAMES,
  TRANSITION_DURATION_FRAMES,
} from "../constants";
import { CommandTitle } from "../components/command-title";
import { PersistentPhone } from "../components/persistent-phone";
import { DiagnoseAndFix } from "../scenes/diagnose-and-fix";
import { ScoreReveal } from "../scenes/score-reveal";
import { SimulatorPreview } from "../scenes/simulator-preview";
import { TerminalTyping } from "../scenes/terminal-typing";

export const Main = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
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
          <SimulatorPreview />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_DURATION_FRAMES,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES}>
          <DiagnoseAndFix />
        </TransitionSeries.Sequence>

        <TransitionSeries.Sequence durationInFrames={SCENE_SCORE_REVEAL_DURATION_FRAMES}>
          <ScoreReveal />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <PersistentPhone />
      <CommandTitle />
    </AbsoluteFill>
  );
};
