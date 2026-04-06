import { motion } from "framer-motion";

// Maps OWM condition codes to icon type
export function getIconType(code: number, isNight = false): string {
  if (code >= 200 && code < 300) return "thunder";
  if (code >= 300 && code < 400) return "drizzle";
  if (code >= 500 && code < 600) return "rain";
  if (code >= 600 && code < 700) return "snow";
  if (code >= 700 && code < 800) return "mist";
  if (code === 800) return isNight ? "clear-night" : "clear";
  if (code === 801 || code === 802) return isNight ? "partly-cloudy-night" : "partly-cloudy";
  return "cloudy";
}

interface IconProps {
  size?: number;
  color?: string;
}

// ─── CLEAR / SUNNY ───────────────────────────────────────────────────────────

function ClearIcon({ size = 40, color = "#f59e0b" }: IconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.circle cx="20" cy="20" r="9" fill={color}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <motion.line key={deg}
          x1={20 + Math.cos(deg * Math.PI / 180) * 13}
          y1={20 + Math.sin(deg * Math.PI / 180) * 13}
          x2={20 + Math.cos(deg * Math.PI / 180) * 17}
          y2={20 + Math.sin(deg * Math.PI / 180) * 17}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
        />
      ))}
    </motion.svg>
  );
}

// ─── CLEAR NIGHT ─────────────────────────────────────────────────────────────

function ClearNightIcon({ size = 40, color = "#a78bfa" }: IconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.path
        d="M27 20.5C27 26.299 22.299 31 16.5 31C13.52 31 10.82 29.79 8.88 27.83C9.82 28.06 10.8 28.18 11.82 28.18C18.48 28.18 23.88 22.78 23.88 16.12C23.88 13.11 22.77 10.35 20.93 8.24C24.44 9.96 27 14 27 20.5Z"
        fill={color}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {[[32, 8], [34, 14], [30, 12]].map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={1.5} fill={color}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
        />
      ))}
    </motion.svg>
  );
}

// ─── CLOUDY ──────────────────────────────────────────────────────────────────

function CloudyIcon({ size = 40, color = "#94a3b8" }: IconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.path
        d="M31 24.5C31 27.26 28.76 29.5 26 29.5H13C9.69 29.5 7 26.81 7 23.5C7 20.55 9.07 18.09 11.87 17.6C12.15 13.93 15.2 11 19 11C22.41 11 25.22 13.35 25.87 16.5C28.7 16.55 31 18.84 31 21.5V24.5Z"
        fill={color}
        animate={{ x: [0, 1.5, 0, -1.5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

// ─── PARTLY CLOUDY ───────────────────────────────────────────────────────────

function PartlyCloudyIcon({ size = 40 }: IconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.circle cx="15" cy="15" r="7" fill="#f59e0b"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <motion.line key={deg}
          x1={15 + Math.cos(deg * Math.PI / 180) * 10}
          y1={15 + Math.sin(deg * Math.PI / 180) * 10}
          x2={15 + Math.cos(deg * Math.PI / 180) * 13}
          y2={15 + Math.sin(deg * Math.PI / 180) * 13}
          stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.33 }}
        />
      ))}
      <motion.path
        d="M33 27C33 29.21 31.21 31 29 31H18C15.24 31 13 28.76 13 26C13 23.58 14.74 21.56 17.07 21.09C17.29 18.27 19.64 16 22.5 16C25.09 16 27.27 17.84 27.86 20.29C30.71 20.62 33 23.05 33 26V27Z"
        fill="#94a3b8"
        animate={{ x: [0, 1, 0, -1, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

// ─── PARTLY CLOUDY NIGHT ─────────────────────────────────────────────────────

function PartlyCloudyNightIcon({ size = 40 }: IconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.path
        d="M20 14C20 17.87 17.3 21.07 13.67 21.83C14.42 21.94 15.2 22 16 22C16.33 22 16.66 21.99 16.99 21.97C17.01 21.98 17.03 22 17.05 22H17.07C17.29 19.18 19.64 17 22.5 17C22.62 17 22.74 17.01 22.85 17.02C21.14 15.75 19.99 13.75 19.99 11.5C19.99 11.5 20 14 20 14Z"
        fill="#a78bfa" opacity={0.6}
      />
      <motion.path
        d="M14 11C14 14.87 11.52 18.07 8.1 19.07C9.1 19.36 10.15 19.5 11.25 19.5C11.5 19.5 11.75 19.49 12 19.47V19.09C14.79 18.62 17 16.02 17 13C17 10.33 15.39 8.04 13.07 7.03C13.65 8.26 14 9.59 14 11Z"
        fill="#a78bfa" opacity={0.9}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.path
        d="M33 27C33 29.21 31.21 31 29 31H18C15.24 31 13 28.76 13 26C13 23.58 14.74 21.56 17.07 21.09C17.29 18.27 19.64 16 22.5 16C25.09 16 27.27 17.84 27.86 20.29C30.71 20.62 33 23.05 33 26V27Z"
        fill="#64748b"
        animate={{ x: [0, 1, 0, -1, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </motion.svg>
  );
}

// ─── RAIN ─────────────────────────────────────────────────────────────────────

function RainIcon({ size = 40 }: IconProps) {
  const drops = [
    { x: 14, delay: 0 },
    { x: 20, delay: 0.3 },
    { x: 26, delay: 0.15 },
    { x: 17, delay: 0.45 },
    { x: 23, delay: 0.6 },
  ];
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.path
        d="M30 20C30 22.21 28.21 24 26 24H13C10.24 24 8 21.76 8 19C8 16.58 9.74 14.56 12.07 14.09C12.29 11.27 14.64 9 17.5 9C20.09 9 22.27 10.84 22.86 13.29C25.71 13.62 28 16.05 28 19V20H30Z"
        fill="#94a3b8"
      />
      {drops.map((d, i) => (
        <motion.line key={i}
          x1={d.x} y1={27} x2={d.x - 2} y2={34}
          stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"
          animate={{ y: [0, 3, 0], opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: d.delay, ease: "easeIn" }}
        />
      ))}
    </motion.svg>
  );
}

// ─── DRIZZLE ─────────────────────────────────────────────────────────────────

function DrizzleIcon({ size = 40 }: IconProps) {
  const drops = [
    { x: 15, delay: 0 },
    { x: 21, delay: 0.4 },
    { x: 27, delay: 0.2 },
    { x: 18, delay: 0.6 },
  ];
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.path
        d="M30 20C30 22.21 28.21 24 26 24H13C10.24 24 8 21.76 8 19C8 16.58 9.74 14.56 12.07 14.09C12.29 11.27 14.64 9 17.5 9C20.09 9 22.27 10.84 22.86 13.29C25.71 13.62 28 16.05 28 19V20H30Z"
        fill="#94a3b8"
      />
      {drops.map((d, i) => (
        <motion.circle key={i} cx={d.x} cy={30} r={1.5}
          fill="#93c5fd"
          animate={{ y: [0, 5, 0], opacity: [0.8, 0.2, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: d.delay }}
        />
      ))}
    </motion.svg>
  );
}

// ─── SNOW ─────────────────────────────────────────────────────────────────────

function SnowIcon({ size = 40 }: IconProps) {
  const flakes = [
    { x: 14, delay: 0 },
    { x: 20, delay: 0.4 },
    { x: 26, delay: 0.2 },
    { x: 17, delay: 0.7 },
    { x: 23, delay: 0.55 },
  ];
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.path
        d="M30 20C30 22.21 28.21 24 26 24H13C10.24 24 8 21.76 8 19C8 16.58 9.74 14.56 12.07 14.09C12.29 11.27 14.64 9 17.5 9C20.09 9 22.27 10.84 22.86 13.29C25.71 13.62 28 16.05 28 19V20H30Z"
        fill="#94a3b8"
      />
      {flakes.map((f, i) => (
        <motion.text key={i} x={f.x - 3} y={32} fontSize="6" fill="#bfdbfe"
          animate={{ y: [0, 6, 0], rotate: [0, 180, 360], opacity: [0.9, 0.4, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, delay: f.delay }}
        >
          ❄
        </motion.text>
      ))}
    </motion.svg>
  );
}

// ─── THUNDER ─────────────────────────────────────────────────────────────────

function ThunderIcon({ size = 40 }: IconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.path
        d="M30 20C30 22.21 28.21 24 26 24H13C10.24 24 8 21.76 8 19C8 16.58 9.74 14.56 12.07 14.09C12.29 11.27 14.64 9 17.5 9C20.09 9 22.27 10.84 22.86 13.29C25.71 13.62 28 16.05 28 19V20H30Z"
        fill="#6b7280"
      />
      <motion.path
        d="M22 25L17 31L20 31L18 37L23 30L20 30Z"
        fill="#fbbf24"
        animate={{ opacity: [1, 0.2, 1, 0.1, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.3, 0.35, 0.65, 0.7] }}
      />
    </motion.svg>
  );
}

// ─── MIST ─────────────────────────────────────────────────────────────────────

function MistIcon({ size = 40, color = "#94a3b8" }: IconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      {[12, 17, 22, 27, 32].map((y, i) => (
        <motion.line key={y}
          x1={i % 2 === 0 ? 6 : 8} y1={y}
          x2={i % 2 === 0 ? 34 : 32} y2={y}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          animate={{ opacity: [0.3, 0.8, 0.3], x: [0, i % 2 === 0 ? 2 : -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
        />
      ))}
    </motion.svg>
  );
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export interface WeatherIconProps {
  code: number;
  isNight?: boolean;
  size?: number;
}

export function WeatherIcon({ code, isNight = false, size = 40 }: WeatherIconProps) {
  const type = getIconType(code, isNight);
  switch (type) {
    case "clear":           return <ClearIcon size={size} />;
    case "clear-night":     return <ClearNightIcon size={size} />;
    case "partly-cloudy":   return <PartlyCloudyIcon size={size} />;
    case "partly-cloudy-night": return <PartlyCloudyNightIcon size={size} />;
    case "cloudy":          return <CloudyIcon size={size} />;
    case "rain":            return <RainIcon size={size} />;
    case "drizzle":         return <DrizzleIcon size={size} />;
    case "snow":            return <SnowIcon size={size} />;
    case "thunder":         return <ThunderIcon size={size} />;
    case "mist":            return <MistIcon size={size} />;
    default:                return <CloudyIcon size={size} />;
  }
}
