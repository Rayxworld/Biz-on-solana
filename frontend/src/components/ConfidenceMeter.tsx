import React from 'react';

interface ConfidenceMeterProps {
  confidence: number; // 0–1
  size?: number;
}

const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ confidence, size = 120 }) => {
  const pct = Math.round(confidence * 100);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - confidence);

  // Color based on confidence level
  const color =
    pct >= 75 ? '#34d399' :   // emerald
    pct >= 65 ? '#fbbf24' :   // amber
    pct >= 40 ? '#fb923c' :   // orange
    '#f87171';                 // red

  const label =
    pct >= 75 ? 'Strong' :
    pct >= 65 ? 'Moderate' :
    pct >= 40 ? 'Weak' :
    'Low';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.5s ease',
          }}
        />
      </svg>
      {/* Center text */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-2xl font-bold text-white">{pct}%</span>
        <span className="text-[10px] uppercase tracking-widest" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
};

export default ConfidenceMeter;
