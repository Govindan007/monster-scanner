import React from 'react';

/**
 * VEIL // Creature Silhouette Component
 * Renders distinct, bespoke vector silhouettes for each horror entity:
 * - THE WATCHER: Tall, elongated, emaciated humanoid with piercing pale cyan eyes and ribbed aura.
 * - THE DRIFTER: Levitating icosahedral core with detached orbiting tendril shards and violet beacon.
 * - THE CRAWLER: Low-profile multi-limbed chitinous horror with amber/crimson eye cluster and segmented carapace.
 */
export default function CreatureSilhouette({
  entityId = 'the-watcher',
  className = '',
  size = 'normal', // 'small' | 'normal' | 'large'
  animate = true,
}) {
  const normId = entityId?.toLowerCase() || 'the-watcher';

  if (normId.includes('drifter')) {
    return (
      <div className={`creature-silhouette-wrap drifter-silhouette ${size} ${className} ${animate ? 'animated' : ''}`}>
        <svg
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="silhouette-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="drifterCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#7e22ce" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="drifterShardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a112c" stopOpacity="0.98" />
              <stop offset="50%" stopColor="#0d0818" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#05030a" stopOpacity="0.92" />
            </linearGradient>
            <radialGradient id="drifterAuraGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient Ethereal Aura */}
          <circle cx="120" cy="115" r="95" fill="url(#drifterAuraGrad)" />

          {/* Tilted Orbital Tendril Ring */}
          <ellipse
            cx="120"
            cy="115"
            rx="85"
            ry="24"
            fill="none"
            stroke="#a855f7"
            strokeWidth="1.2"
            strokeDasharray="12 6 4 6"
            opacity="0.45"
            transform="rotate(-22 120 115)"
          />

          {/* Outer Detached Orbiting Shards */}
          <g className="drifter-shards-group">
            {/* Upper Left Shard */}
            <polygon
              points="45,45 62,35 52,105 40,95"
              fill="url(#drifterShardGrad)"
              stroke="#c084fc"
              strokeWidth="0.8"
              opacity="0.9"
            />
            {/* Upper Right Shard */}
            <polygon
              points="188,40 205,52 195,115 178,100"
              fill="url(#drifterShardGrad)"
              stroke="#c084fc"
              strokeWidth="0.8"
              opacity="0.9"
            />
            {/* Lower Left Tendril Shard */}
            <polygon
              points="60,140 75,130 55,205 45,190"
              fill="url(#drifterShardGrad)"
              stroke="#a855f7"
              strokeWidth="0.8"
              opacity="0.85"
            />
            {/* Lower Right Tendril Shard */}
            <polygon
              points="175,135 190,145 180,215 168,200"
              fill="url(#drifterShardGrad)"
              stroke="#a855f7"
              strokeWidth="0.8"
              opacity="0.85"
            />
          </g>

          {/* Central Levitating Geometric Core */}
          <polygon
            points="120,60 165,85 165,145 120,170 75,145 75,85"
            fill="url(#drifterShardGrad)"
            stroke="#c084fc"
            strokeWidth="1.5"
          />
          <polygon
            points="120,60 120,170"
            stroke="#7e22ce"
            strokeWidth="1"
            opacity="0.5"
          />
          <polygon
            points="75,85 165,145"
            stroke="#7e22ce"
            strokeWidth="1"
            opacity="0.5"
          />
          <polygon
            points="75,145 165,85"
            stroke="#7e22ce"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Glowing Focal Eye / Beacon */}
          <circle cx="120" cy="115" r="14" fill="url(#drifterCoreGlow)" />
          <circle cx="120" cy="115" r="6" fill="#ffffff" />
          <circle
            cx="120"
            cy="115"
            r="22"
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="1"
            opacity="0.6"
            className="pulse-ring"
          />
        </svg>
      </div>
    );
  }

  if (normId.includes('crawler')) {
    return (
      <div className={`creature-silhouette-wrap crawler-silhouette ${size} ${className} ${animate ? 'animated' : ''}`}>
        <svg
          viewBox="0 0 280 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="silhouette-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="crawlerEyeAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#b45309" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="crawlerEyeCrimson" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="crawlerChitinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#142018" stopOpacity="0.98" />
              <stop offset="60%" stopColor="#08100a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#030604" stopOpacity="0.92" />
            </linearGradient>
            <radialGradient id="crawlerSubAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Low Ground Aura */}
          <ellipse cx="140" cy="120" rx="110" ry="40" fill="url(#crawlerSubAura)" />

          {/* 6 Articulated Limbs (3 Left, 3 Right) */}
          {/* Front Left Limb */}
          <path
            d="M100 110 L50 65 L25 150"
            stroke="url(#crawlerChitinGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M100 110 L50 65 L25 150"
            stroke="#10b981"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />

          {/* Mid Left Limb */}
          <path
            d="M95 125 L40 110 L15 175"
            stroke="url(#crawlerChitinGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Rear Left Limb */}
          <path
            d="M105 138 L60 160 L38 188"
            stroke="url(#crawlerChitinGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Front Right Limb */}
          <path
            d="M180 110 L230 65 L255 150"
            stroke="url(#crawlerChitinGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M180 110 L230 65 L255 150"
            stroke="#10b981"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />

          {/* Mid Right Limb */}
          <path
            d="M185 125 L240 110 L265 175"
            stroke="url(#crawlerChitinGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Rear Right Limb */}
          <path
            d="M175 138 L220 160 L242 188"
            stroke="url(#crawlerChitinGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Abdomen Tail Segment */}
          <ellipse
            cx="140"
            cy="148"
            rx="32"
            ry="24"
            fill="url(#crawlerChitinGrad)"
            stroke="#10b981"
            strokeWidth="0.8"
            opacity="0.9"
          />

          {/* Thorax Carapace */}
          <ellipse
            cx="140"
            cy="115"
            rx="46"
            ry="30"
            fill="url(#crawlerChitinGrad)"
            stroke="#34d399"
            strokeWidth="1"
          />

          {/* Dorsal Spine Ridges */}
          <path
            d="M125 105 L140 92 L155 105 M130 120 L140 110 L150 120 M134 135 L140 128 L146 135"
            stroke="#34d399"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Head & Mandibles */}
          <ellipse cx="140" cy="85" rx="26" ry="18" fill="url(#crawlerChitinGrad)" stroke="#10b981" strokeWidth="0.8" />
          <path d="M128 96 L134 110 M152 96 L146 110" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

          {/* Eye Cluster (2 Primary Amber, 4 Lateral Crimson) */}
          <circle cx="134" cy="82" r="4.5" fill="url(#crawlerEyeAmber)" />
          <circle cx="146" cy="82" r="4.5" fill="url(#crawlerEyeAmber)" />
          <circle cx="125" cy="84" r="2.5" fill="url(#crawlerEyeCrimson)" />
          <circle cx="155" cy="84" r="2.5" fill="url(#crawlerEyeCrimson)" />
          <circle cx="128" cy="76" r="2" fill="url(#crawlerEyeCrimson)" />
          <circle cx="152" cy="76" r="2" fill="url(#crawlerEyeCrimson)" />
        </svg>
      </div>
    );
  }

  // Default: THE WATCHER (tall elongated humanoid)
  return (
    <div className={`creature-silhouette-wrap watcher-silhouette ${size} ${className} ${animate ? 'animated' : ''}`}>
      <svg
        viewBox="0 0 200 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="silhouette-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="watcherEyePale" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#e0f8ff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="watcherBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#141824" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#0b0e16" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#030407" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="watcherVaporFade" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#141824" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#080c14" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#020306" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="watcherAuraGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Pale Cyan Aura */}
        <ellipse cx="100" cy="180" rx="85" ry="160" fill="url(#watcherAuraGrad)" />

        {/* Dissolving Lower Legs & Feet */}
        <path
          d="M78 260 L74 410 L68 440 L82 440 L86 260 Z"
          fill="url(#watcherVaporFade)"
        />
        <path
          d="M122 260 L126 410 L132 440 L118 440 L114 260 Z"
          fill="url(#watcherVaporFade)"
        />

        {/* Emaciated Elongated Torso & Spine */}
        <polygon
          points="62,110 138,110 116,260 84,260"
          fill="url(#watcherBodyGrad)"
          stroke="#00f0ff"
          strokeWidth="0.8"
          opacity="0.95"
        />

        {/* Sculpted Ribcage Aura Lines */}
        <path
          d="M72 130 C90 122 110 122 128 130 M70 148 C90 140 110 140 130 148 M74 168 C90 160 110 160 126 168 M78 188 C90 180 110 180 122 188"
          stroke="#ff2a44"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* Elongated Arms & Slender Claws */}
        {/* Left Arm */}
        <path
          d="M62 115 L45 220 L35 340 L33 370"
          stroke="url(#watcherBodyGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M62 115 L45 220 L35 340 L33 370"
          stroke="#00f0ff"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />
        {/* Right Arm */}
        <path
          d="M138 115 L155 220 L165 340 L167 370"
          stroke="url(#watcherBodyGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M138 115 L155 220 L165 340 L167 370"
          stroke="#00f0ff"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />

        {/* Elongated Neck & Narrow Head */}
        <path d="M92 112 L92 88 L108 88 L108 112 Z" fill="url(#watcherBodyGrad)" />
        <ellipse cx="100" cy="62" rx="20" ry="32" fill="url(#watcherBodyGrad)" stroke="#00f0ff" strokeWidth="0.8" />

        {/* Uncanny Pale Cyan Fixation Eyes */}
        <ellipse cx="92" cy="60" rx="4.5" ry="6.5" fill="url(#watcherEyePale)" />
        <circle cx="92" cy="60" r="1.8" fill="#ffffff" />
        <ellipse cx="108" cy="60" rx="4.5" ry="6.5" fill="url(#watcherEyePale)" />
        <circle cx="108" cy="60" r="1.8" fill="#ffffff" />
      </svg>
    </div>
  );
}
