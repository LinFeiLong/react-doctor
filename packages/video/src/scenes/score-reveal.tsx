import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  GREEN_COLOR,
  MUTED_COLOR,
  PERFECT_SCORE,
  REACT_DOCTOR_URL,
  YELLOW_COLOR,
} from "../constants";
import { CommitResultCards } from "../components/commit-result-cards";
import { DoctorFace } from "../components/doctor-face";
import { fontFamily } from "../utils/font";
import { getDoctorMood, getScoreColor, getScoreLabel } from "../utils/score-display";

const CARDS_RISE_PX = 40;
const CARDS_FADE_IN_FRAMES = 12;
const CONFETTI_START_FRAME = 6;
const URL_FONT_SIZE_PX = 44;
const SCORE_NUMBER_FONT_SIZE_PX = 96;
const SCORE_LABEL_FONT_SIZE_PX = 52;
const SCORE_FACE_SIZE_PX = 200;
const SCORE_ROW_GAP_PX = 36;

const CONFETTI_COUNT = 500;
const CONFETTI_WAVES = 4;
const CONFETTI_WAVE_DELAY_FRAMES = 5;
const CONFETTI_COLORS = [GREEN_COLOR, YELLOW_COLOR, "#60a5fa", "#c084fc", "#fb923c", "#f472b6", "#34d399", "#fbbf24", "#818cf8"];

const confettiParticles = Array.from({ length: CONFETTI_COUNT }).map((_, particleIndex) => {
  const angle = random(`angle-${particleIndex}`) * Math.PI * 0.8 + Math.PI * 0.1;
  const velocity = 12 + random(`vel-${particleIndex}`) * 28;
  return {
    startX: random(`sx-${particleIndex}`) * 1920,
    startY: -20 + random(`sy-${particleIndex}`) * 40,
    velocityX: (random(`vx-${particleIndex}`) - 0.5) * 16,
    velocityY: Math.sin(angle) * velocity,
    gravity: 0.6 + random(`g-${particleIndex}`) * 0.4,
    wave: Math.floor(random(`wave-${particleIndex}`) * CONFETTI_WAVES),
    delay: random(`delay-${particleIndex}`) * 3,
    size: 8 + random(`size-${particleIndex}`) * 16,
    color: CONFETTI_COLORS[Math.floor(random(`color-${particleIndex}`) * CONFETTI_COLORS.length)],
    rotation: random(`rot-${particleIndex}`) * 360,
    rotationSpeed: (random(`rotspeed-${particleIndex}`) - 0.5) * 20,
    aspectRatio: 0.3 + random(`aspect-${particleIndex}`) * 0.7,
  };
});

export const ScoreReveal = () => {
  const frame = useCurrentFrame();

  const cardsOpacity = interpolate(frame, [0, CARDS_FADE_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const cardsTranslateY = interpolate(frame, [0, CARDS_FADE_IN_FRAMES], [CARDS_RISE_PX, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const confettiProgress = Math.max(0, frame - CONFETTI_START_FRAME);

  const scoreColor = getScoreColor(PERFECT_SCORE);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 48,
      }}
    >
      {confettiProgress > 0 &&
        confettiParticles.map((particle, particleIndex) => {
          const waveOffset = particle.wave * CONFETTI_WAVE_DELAY_FRAMES;
          const localProgress = Math.max(0, confettiProgress - particle.delay - waveOffset);
          const posX = particle.startX + particle.velocityX * localProgress;
          const posY =
            particle.startY +
            particle.velocityY * localProgress +
            0.5 * particle.gravity * localProgress * localProgress;
          const rotation = particle.rotation + localProgress * particle.rotationSpeed;
          const opacity = interpolate(localProgress, [0, 2, 30, 50], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={particleIndex}
              style={{
                position: "absolute",
                left: posX,
                top: posY,
                width: particle.size,
                height: particle.size * particle.aspectRatio,
                backgroundColor: particle.color,
                opacity,
                transform: `rotate(${rotation}deg)`,
                borderRadius: 2,
              }}
            />
          );
        })}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: SCORE_ROW_GAP_PX,
          opacity: cardsOpacity,
          transform: `translateY(${cardsTranslateY}px)`,
        }}
      >
        <DoctorFace size={SCORE_FACE_SIZE_PX} color={scoreColor} mood={getDoctorMood(PERFECT_SCORE)} />
        <div style={{ fontFamily }}>
          <span style={{ color: scoreColor, fontWeight: 500, fontSize: SCORE_NUMBER_FONT_SIZE_PX }}>
            {PERFECT_SCORE}
          </span>
          <span style={{ color: MUTED_COLOR, fontSize: SCORE_LABEL_FONT_SIZE_PX }}>
            {` / ${PERFECT_SCORE}  `}
          </span>
          <span style={{ color: scoreColor, fontSize: SCORE_LABEL_FONT_SIZE_PX }}>
            {getScoreLabel(PERFECT_SCORE)}
          </span>
        </div>
      </div>

      <div style={{ opacity: cardsOpacity, transform: `translateY(${cardsTranslateY}px)` }}>
        <CommitResultCards />
      </div>

      <div
        style={{
          fontFamily,
          fontSize: URL_FONT_SIZE_PX,
          color: MUTED_COLOR,
          opacity: cardsOpacity,
        }}
      >
        {REACT_DOCTOR_URL}
      </div>
    </AbsoluteFill>
  );
};
