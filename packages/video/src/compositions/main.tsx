import { AbsoluteFill, Series } from "remotion";
import { CHECKS_FAIL_TIMING, CHECKS_PASS_TIMING, SCENE_CLAUDE_DURATION_FRAMES } from "../constants";
import { ClaudeCode } from "../scenes/claude-code";
import { GithubChecks } from "../scenes/github-checks";

export const Main = () => {
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={CHECKS_FAIL_TIMING.durationFrames}>
          <GithubChecks outcome="fail" timing={CHECKS_FAIL_TIMING} />
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_CLAUDE_DURATION_FRAMES}>
          <ClaudeCode />
        </Series.Sequence>

        <Series.Sequence durationInFrames={CHECKS_PASS_TIMING.durationFrames}>
          <GithubChecks outcome="pass" timing={CHECKS_PASS_TIMING} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
