<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    role="img"
    aria-labelledby="mark-title mark-desc"
  >
    <title id="mark-title">SME StockSense animated S mark</title>
    <desc id="mark-desc">GSAP-ready StockSense S logo with separate body, swoosh, inventory cubes and data pixels.</desc>

    <defs>
      <linearGradient id="markGradTop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#047857"/>
        <stop offset="55%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#84CC16"/>
      </linearGradient>

      <linearGradient id="markGradBottom" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#065F46"/>
        <stop offset="55%" stop-color="#059669"/>
        <stop offset="100%" stop-color="#22C55E"/>
      </linearGradient>

      <linearGradient id="markGradSwoosh" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#0F766E"/>
        <stop offset="60%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#A3E635"/>
      </linearGradient>

      <linearGradient id="markGradCube" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#047857"/>
        <stop offset="100%" stop-color="#22C55E"/>
      </linearGradient>

      <filter id="markSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.10"/>
      </filter>
    </defs>

    <g id="s-body" filter="url(#markSoftShadow)">
      <path id="s-body-top"
        d="M118 96 C152 62 197 48 252 48 H365 C382 48 394 63 389 78 L376 113 C372 125 361 133 348 133 H241 C211 133 189 142 173 158 C158 173 154 192 163 205 C174 222 199 226 226 214 L262 198 L300 236 L245 261 C188 287 129 274 97 231 C63 185 76 130 118 96 Z"
        fill="url(#markGradTop)"/>

      <path id="s-body-bottom"
        d="M214 279 L254 258 L293 294 L267 307 C250 316 241 329 245 342 C250 359 271 368 301 368 H354 C380 368 395 358 400 340 C405 322 394 307 374 296 L338 277 L367 238 L414 264 C461 290 479 334 466 379 C452 427 410 454 350 454 H185 C170 454 160 438 168 425 L194 384 C199 376 208 372 218 372 H301 C319 372 331 366 334 356 C338 344 330 334 314 327 L278 311 L240 330 L214 279 Z"
        fill="url(#markGradBottom)"/>
    </g>

    <g id="swoosh">
      <path id="swoosh-path"
        d="M83 405 C145 340 212 292 278 255 C345 217 395 178 424 134"
        fill="none"
        stroke="url(#markGradSwoosh)"
        stroke-width="22"
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="100"/>
      <path id="swoosh-highlight"
        d="M91 396 C154 334 219 288 283 252 C346 216 390 182 416 145"
        fill="none"
        stroke="#D9F99D"
        stroke-width="4"
        stroke-linecap="round"
        opacity="0.45"
        pathLength="100"/>
    </g>

    <g id="inventory" transform="translate(0 2)">
      <g id="box-1" transform="translate(225 315)">
        <polygon points="32,0 64,18 32,36 0,18" fill="#22C55E"/>
        <polygon points="0,18 32,36 32,72 0,54" fill="#047857"/>
        <polygon points="64,18 32,36 32,72 64,54" fill="#059669"/>
        <polyline points="32,0 64,18 32,36 0,18 32,0 32,36 32,72" fill="none" stroke="#FFFFFF" stroke-width="3"/>
        <polyline points="0,18 0,54 32,72 64,54 64,18" fill="none" stroke="#FFFFFF" stroke-width="3"/>
      </g>

      <g id="box-2" transform="translate(180 350)">
        <polygon points="32,0 64,18 32,36 0,18" fill="#16A34A"/>
        <polygon points="0,18 32,36 32,72 0,54" fill="#047857"/>
        <polygon points="64,18 32,36 32,72 64,54" fill="#059669"/>
        <polyline points="32,0 64,18 32,36 0,18 32,0 32,36 32,72" fill="none" stroke="#FFFFFF" stroke-width="3"/>
        <polyline points="0,18 0,54 32,72 64,54 64,18" fill="none" stroke="#FFFFFF" stroke-width="3"/>
      </g>

      <g id="box-3" transform="translate(270 350)">
        <polygon points="32,0 64,18 32,36 0,18" fill="#22C55E"/>
        <polygon points="0,18 32,36 32,72 0,54" fill="#059669"/>
        <polygon points="64,18 32,36 32,72 64,54" fill="#16A34A"/>
        <polyline points="32,0 64,18 32,36 0,18 32,0 32,36 32,72" fill="none" stroke="#FFFFFF" stroke-width="3"/>
        <polyline points="0,18 0,54 32,72 64,54 64,18" fill="none" stroke="#FFFFFF" stroke-width="3"/>
      </g>
    </g>

    <g id="pixels" fill="url(#markGradTop)">
      <rect id="pixel-1" x="391" y="92" width="22" height="22" rx="4"/>
      <rect id="pixel-2" x="421" y="73" width="20" height="20" rx="4"/>
      <rect id="pixel-3" x="424" y="103" width="20" height="20" rx="4"/>
      <rect id="pixel-4" x="449" y="49" width="26" height="26" rx="5"/>
    </g>
  </svg>
</template>
