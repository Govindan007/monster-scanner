import React from 'react';

/**
 * Atmospheric Inline SVG Creepy Humanoid Entity
 * Tall, unnaturally thin, shadow silhouette with elongated limbs,
 * featureless dark face, and faint pale glowing eyes.
 * Zero external assets or downloads required.
 */
export default function HumanoidEntity() {
  return (
    <div className="humanoid-entity-container" aria-hidden="true">
      <svg
        className="humanoid-svg"
        viewBox="0 0 220 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Eerie Shadow Gradients */}
          <radialGradient
            id="paleEyeGlow"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#e2e8f0" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#94a3b8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="shadowBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#080a0f" stopOpacity="0.96" />
            <stop offset="50%" stopColor="#030406" stopOpacity="0.94" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.88" />
          </linearGradient>

          <linearGradient id="vaporFade" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#080b10" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#040608" stopOpacity="0.75" />
            <stop offset="90%" stopColor="#020304" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          {/* Soft Smoky Aura Filter */}
          <filter id="spectralGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.7" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Smoky Ghostly Aura Silhouette */}
        <g filter="url(#spectralGlow)" opacity="0.65" className="humanoid-aura">
          {/* Distorted Head Aura */}
          <ellipse cx="110" cy="58" rx="26" ry="36" fill="#000000" />
          {/* Extended Neck Aura */}
          <path d="M102 88 L104 135 L116 135 L118 88 Z" fill="#000000" />
          {/* Torso Aura */}
          <path
            d="M80 135 C88 120, 132 120, 140 135 L130 260 C125 320, 95 320, 90 260 Z"
            fill="#000000"
          />
          {/* Elongated Arms Aura */}
          <path
            d="M82 138 Q60 220 54 320 Q50 380 44 420"
            stroke="#000000"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M138 138 Q160 220 166 320 Q170 380 176 420"
            stroke="#000000"
            strokeWidth="14"
            strokeLinecap="round"
          />
        </g>

        {/* Primary Humanoid Anatomy (Dark, Emaciated Silhouette) */}
        <g className="humanoid-core">
          {/* Elongated Lower Body fading into misty vapor */}
          <path
            d="M92 240 Q84 320 80 410 Q78 460 76 500 Q110 515 144 500 Q142 460 140 410 Q136 320 128 240 Z"
            fill="url(#vaporFade)"
          />

          {/* Ribs / Spinal Emaciation Creases */}
          <path
            d="M98 175 Q110 180 122 175 M96 195 Q110 200 124 195 M98 215 Q110 220 122 215"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Torso */}
          <path
            d="M82 136 C92 124, 128 124, 138 136 L128 250 C124 290, 96 290, 92 250 Z"
            fill="url(#shadowBody)"
          />

          {/* Long Neck */}
          <path d="M104 84 L105 136 L115 136 L116 84 Z" fill="url(#shadowBody)" />

          {/* Asymmetric Distorted Head */}
          <path
            d="M110 22 C125 22, 134 38, 133 60 C132 82, 122 96, 110 96 C98 96, 87 82, 88 58 C89 36, 96 22, 110 22 Z"
            fill="url(#shadowBody)"
          />

          {/* Left Elongated Arm & Spindly Clawed Tendrils */}
          <path
            d="M84 138 Q66 220 60 310 Q56 380 50 435"
            stroke="url(#shadowBody)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Fingers */}
          <path d="M50 435 Q46 455 42 470" stroke="url(#shadowBody)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 435 Q50 460 48 476" stroke="url(#shadowBody)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 435 Q54 458 56 472" stroke="url(#shadowBody)" strokeWidth="2" strokeLinecap="round" />

          {/* Right Elongated Arm & Spindly Clawed Tendrils */}
          <path
            d="M136 138 Q154 220 160 310 Q164 380 170 435"
            stroke="url(#shadowBody)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Fingers */}
          <path d="M170 435 Q166 458 164 472" stroke="url(#shadowBody)" strokeWidth="2" strokeLinecap="round" />
          <path d="M170 435 Q170 460 172 476" stroke="url(#shadowBody)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M170 435 Q174 455 178 470" stroke="url(#shadowBody)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Atmospheric Void Face Details: Featureless dark cavity with faint pale eyes */}
          <ellipse cx="110" cy="62" rx="15" ry="22" fill="#020305" opacity="0.9" />

          {/* Left Pale Eye (Faint, uncanny pinpoint) */}
          <g className="humanoid-eye left-eye">
            <ellipse cx="103" cy="55" rx="3.5" ry="4.5" fill="url(#paleEyeGlow)" />
            <circle cx="103" cy="55" r="1.5" fill="#ffffff" />
          </g>

          {/* Right Pale Eye (Slightly asymmetric and sunken) */}
          <g className="humanoid-eye right-eye">
            <ellipse cx="118" cy="56" rx="3" ry="4" fill="url(#paleEyeGlow)" />
            <circle cx="118" cy="56" r="1.4" fill="#ffffff" />
          </g>
        </g>
      </svg>
    </div>
  );
}
