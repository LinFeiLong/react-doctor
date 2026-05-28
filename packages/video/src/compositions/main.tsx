import { useEffect, useState } from "react";
import { Sequence, continueRender, delayRender } from "remotion";
import { SCENE_FILE_SCAN_DURATION_FRAMES, SCENE_TYPING_DURATION_FRAMES } from "../constants";
import { FileScan } from "../scenes/file-scan";
import { TerminalTyping } from "../scenes/terminal-typing";
import { waitUntilDone } from "../utils/font";

export const Main = () => {
  const [handle] = useState(() => delayRender("Loading font"));

  useEffect(() => {
    waitUntilDone().then(() => continueRender(handle));
  }, [handle]);
  return (
    <>
      <Sequence durationInFrames={SCENE_TYPING_DURATION_FRAMES}>
        <TerminalTyping />
      </Sequence>

      <Sequence
        from={SCENE_TYPING_DURATION_FRAMES}
        durationInFrames={SCENE_FILE_SCAN_DURATION_FRAMES}
      >
        <FileScan />
      </Sequence>
    </>
  );
};
