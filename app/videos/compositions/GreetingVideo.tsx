import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import type { GreetingProps } from "../schemas";

const DECORATIVE_EMOJIS = ["👵", "🏠", "🛡️", "💛", "✨"];

const FloatingEmoji: React.FC<{
  emoji: string;
  startX: number;
  startY: number;
  delay: number;
}> = ({ emoji, startX, startY, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);
  const opacity = interpolate(adjustedFrame, [0, 15, 60, 90], [0, 0.6, 0.6, 0], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(adjustedFrame, [0, 90], [0, -120]);
  const scale = interpolate(adjustedFrame, [0, 20], [0.5, 1], {
    extrapolateRight: "clamp",
  });
  const rotation = interpolate(adjustedFrame, [0, 90], [0, 15]);

  return (
    <div
      style={{
        position: "absolute",
        left: `${startX}%`,
        top: `${startY}%`,
        fontSize: 48,
        opacity,
        transform: `translateY(${y}px) scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      {emoji}
    </div>
  );
};

export const GreetingVideo: React.FC<GreetingProps> = ({
  familyName,
  greetingText,
  personName,
  backgroundColor,
  textColor,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Background fade-in (frames 0-30)
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Greeting text animation (frames 15-60)
  const greetingScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });
  const greetingOpacity = interpolate(frame, [15, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Family name animation (frames 40-80)
  const familyNameY = interpolate(frame, [40, 70], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const familyNameOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Person name animation (frames 60-100)
  const personNameOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const personNameScale = spring({
    frame: frame - 65,
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.6 },
  });

  // Gradient background
  const gradientAngle = interpolate(frame, [0, 150], [135, 165]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${backgroundColor}, ${lightenColor(backgroundColor, 30)})`,
        opacity: bgOpacity,
        direction: "rtl",
        fontFamily: "'Segoe UI', Arial, 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Decorative emojis */}
      <Sequence from={50}>
        {DECORATIVE_EMOJIS.map((emoji, i) => (
          <FloatingEmoji
            key={i}
            emoji={emoji}
            startX={15 + i * 17}
            startY={60 + (i % 3) * 10}
            delay={i * 8}
          />
        ))}
      </Sequence>

      {/* Shield icon */}
      <div
        style={{
          fontSize: 80,
          opacity: interpolate(frame, [5, 25], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 80 } })})`,
          marginBottom: 40,
        }}
      >
        🛡️
      </div>

      {/* Greeting text */}
      <div
        style={{
          color: textColor,
          fontSize: fontSize,
          fontWeight: 700,
          textAlign: "center",
          opacity: greetingOpacity,
          transform: `scale(${greetingScale})`,
          lineHeight: 1.3,
          padding: "0 60px",
          textShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {greetingText}
      </div>

      {/* Family name */}
      <div
        style={{
          color: textColor,
          fontSize: fontSize * 0.65,
          fontWeight: 500,
          marginTop: 30,
          opacity: familyNameOpacity,
          transform: `translateY(${familyNameY}px)`,
          textShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        {familyName}
      </div>

      {/* Person name (optional) */}
      {personName && (
        <div
          style={{
            color: textColor,
            fontSize: fontSize * 0.5,
            fontWeight: 400,
            marginTop: 24,
            opacity: personNameOpacity,
            transform: `scale(${personNameScale})`,
            padding: "8px 32px",
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        >
          שלום {personName}! 👋
        </div>
      )}

      {/* Bottom decoration line */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          width: interpolate(frame, [30, 80], [0, width * 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 3,
          backgroundColor: textColor,
          opacity: 0.3,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};

/** Lighten a hex color by a percentage */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
