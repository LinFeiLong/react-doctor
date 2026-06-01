import { continueRender, delayRender, staticFile } from "remotion";

export const fontFamily = "IBM Plex Mono";

const FONT_WEIGHTS = [
  { weight: "400", file: "fonts/ibm-plex-mono-400.ttf" },
  { weight: "500", file: "fonts/ibm-plex-mono-500.ttf" },
  { weight: "700", file: "fonts/ibm-plex-mono-700.ttf" },
];

const fontHandle = delayRender("Loading IBM Plex Mono");

const documentFonts = document.fonts as FontFaceSet & { add: (font: FontFace) => void };

Promise.all(
  FONT_WEIGHTS.map(({ weight, file }) => {
    const fontFace = new FontFace(fontFamily, `url(${staticFile(file)})`, { weight });
    documentFonts.add(fontFace);
    return fontFace.load();
  }),
)
  .then(() => continueRender(fontHandle))
  .catch(() => continueRender(fontHandle));
