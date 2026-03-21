/**
 * 20 hand-drawn weather illustrations.
 * One is chosen at random when the module first loads (= once per app lifecycle).
 */

const icons: React.FC<React.SVGProps<SVGSVGElement>>[] = [
  /* 0 — Sunny (sun with face) */
  (props) => (
    <svg viewBox="18 18 112 112" fill="none" {...props}>
      <circle cx="70" cy="70" r="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="70" y1="32" x2="70" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="108" x2="70" y2="122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="70" x2="18" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="108" y1="70" x2="122" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="43" x2="33" y2="33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="97" y1="43" x2="107" y2="33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="97" x2="33" y2="107" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="97" y1="97" x2="107" y2="107" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="65" r="3" fill="currentColor" />
      <circle cx="80" cy="65" r="3" fill="currentColor" />
      <path d="M58 78 Q70 88, 82 78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),

  /* 1 — Cloud with rain */
  (props) => (
    <svg viewBox="15 26 92 98" fill="none" {...props}>
      <path d="M30 75 Q20 75, 18 65 Q15 52, 30 48 Q32 32, 50 30 Q68 26, 78 40 Q95 38, 100 52 Q106 65, 95 72 Q90 78, 75 78Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 88 Q36 95, 38 102" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M55 85 Q53 95, 55 108" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 88 Q70 95, 72 102" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 100 Q44 108, 46 118" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M63 100 Q61 108, 63 118" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="103" r="2" fill="currentColor" />
      <circle cx="55" cy="109" r="2" fill="currentColor" />
      <circle cx="72" cy="103" r="2" fill="currentColor" />
      <circle cx="46" cy="119" r="2" fill="currentColor" />
      <circle cx="63" cy="119" r="2" fill="currentColor" />
    </svg>
  ),

  /* 2 — Lightning bolt */
  (props) => (
    <svg viewBox="8 16 104 110" fill="none" {...props}>
      <path d="M25 65 Q15 65, 12 55 Q8 42, 25 38 Q28 22, 48 20 Q68 16, 78 32 Q95 28, 100 42 Q108 58, 95 62 Q88 68, 70 68Z" fill="currentColor" />
      <path d="M58 68 L48 90 L60 90 L45 122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M30 78 L28 92" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M40 75 L38 92" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M78 75 L76 90" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M88 72 L86 88" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  ),

  /* 3 — Snowflake */
  (props) => (
    <svg viewBox="28 22 82 96" fill="none" {...props}>
      <line x1="70" y1="25" x2="70" y2="115" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="31" y1="47" x2="109" y2="93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="31" y1="93" x2="109" y2="47" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M70 38 L62 46 M70 38 L78 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M70 102 L62 94 M70 102 L78 94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M95 55 L88 48 M95 55 L95 65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M95 85 L95 75 M95 85 L88 92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 55 L52 48 M45 55 L45 65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 85 L45 75 M45 85 L52 92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M70 62 L78 70 L70 78 L62 70Z" fill="currentColor" />
    </svg>
  ),

  /* 4 — Person with umbrella in rain */
  (props) => (
    <svg viewBox="0 18 130 122" fill="none" {...props}>
      <path d="M15 62 Q15 28, 65 25 Q115 28, 115 62" fill="currentColor" />
      <path d="M15 62 Q30 52, 40 62 Q50 52, 65 62 Q80 52, 90 62 Q100 52, 115 62" stroke="var(--bg, #fff)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="65" y1="25" x2="65" y2="105" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 105 Q65 112, 58 112 Q52 112, 52 105" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="65" cy="23" r="2" fill="currentColor" />
      <circle cx="65" cy="72" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M65 82 L65 115" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 115 L58 135" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 115 L72 135" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 40 L8 58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M120 38 L118 56" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M5 80 L3 100" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M125 75 L123 95" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),

  /* 5 — Wind blowing person */
  (props) => (
    <svg viewBox="0 8 115 100" fill="none" {...props}>
      <circle cx="70" cy="22" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M78 15 Q90 10, 98 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M80 20 Q92 16, 100 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M74 34 Q85 30, 95 35 Q105 40, 110 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M60 34 Q68 32, 76 34 L72 68 Q66 70, 56 68Z" fill="currentColor" />
      <path d="M72 50 Q82 55, 88 52 Q95 48, 92 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M58 75 Q52 90, 46 105" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M58 75 Q64 90, 66 105" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 30 Q15 28, 25 30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M0 50 Q18 47, 35 50" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 70 Q20 68, 32 70" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 42 L30 42" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),

  /* 6 — Person in snow with hat */
  (props) => (
    <svg viewBox="8 5 106 114" fill="none" {...props}>
      <circle cx="65" cy="35" r="13" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M52 32 Q50 18, 65 14 Q80 18, 78 32" fill="currentColor" />
      <circle cx="65" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M52 44 Q55 50, 65 48 Q75 46, 78 44" fill="currentColor" />
      <circle cx="59" cy="33" r="2" fill="currentColor" />
      <circle cx="71" cy="33" r="2" fill="currentColor" />
      <path d="M60 40 Q65 43, 70 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M50 48 Q65 45, 80 48 L82 78 Q65 82, 48 78Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M50 56 Q38 54, 30 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M80 56 Q92 54, 100 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 85 L56 115" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 85 L74 115" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="15" r="2" fill="currentColor" />
      <circle cx="95" cy="12" r="2" fill="currentColor" />
      <circle cx="110" cy="30" r="1.5" fill="currentColor" />
      <circle cx="15" cy="50" r="1.5" fill="currentColor" />
      <circle cx="108" cy="65" r="2" fill="currentColor" />
      <circle cx="25" cy="80" r="1.5" fill="currentColor" />
      <circle cx="100" cy="90" r="2" fill="currentColor" />
    </svg>
  ),

  /* 7 — Person sunbathing */
  (props) => (
    <svg viewBox="10 0 125 112" fill="none" {...props}>
      <path d="M115 5 L108 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M130 20 L118 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M130 5 Q128 15, 120 18 Q112 8, 118 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="28" cy="75" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="20" y="72" width="8" height="6" rx="1.5" fill="currentColor" />
      <rect x="32" y="72" width="8" height="6" rx="1.5" fill="currentColor" />
      <path d="M28 75 L32 75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 75 L110 75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 75 Q32 65, 22 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 75 Q65 85, 60 90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M110 75 Q115 70, 120 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M110 75 Q115 80, 120 82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 88 L125 88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 92 L128 92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="55" y="92" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M58 92 L54 82" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),

  /* 8 — Tornado */
  (props) => (
    <svg viewBox="5 12 120 115" fill="none" {...props}>
      <path d="M15 25 Q65 20, 115 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 42 Q62 36, 105 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 58 Q60 52, 95 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 72 Q58 67, 82 72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 85 Q58 80, 72 85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 96 Q58 92, 65 96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 106 Q58 103, 62 106" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="18" width="5" height="5" transform="rotate(25 12 20)" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="100" y="15" width="4" height="6" transform="rotate(-15 102 18)" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M20 50 L16 46 L22 44Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="105" cy="48" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M30 120 Q58 115, 85 120" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),

  /* 9 — Rainbow with clouds */
  (props) => (
    <svg viewBox="-2 22 124 78" fill="none" {...props}>
      <path d="M10 95 Q10 30, 60 25 Q110 30, 110 95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 95 Q18 40, 60 35 Q102 40, 102 95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 95 Q26 48, 60 44 Q94 48, 94 95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M0 85 Q0 75, 10 72 Q15 65, 25 68 Q32 62, 40 68 Q48 65, 48 75 Q52 82, 45 88 Q40 95, 25 95 Q10 95, 0 85Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M75 88 Q75 78, 82 75 Q86 68, 95 70 Q100 65, 108 70 Q115 68, 118 78 Q122 85, 115 90 Q110 95, 95 95 Q80 95, 75 88Z" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),

  /* 10 — Thermometer hot */
  (props) => (
    <svg viewBox="42 12 78 118" fill="none" {...props}>
      <rect x="55" y="15" width="16" height="90" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="63" cy="110" r="14" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="63" cy="110" r="9" fill="currentColor" />
      <rect x="59" y="35" width="8" height="70" rx="4" fill="currentColor" />
      <line x1="74" y1="25" x2="82" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="74" y1="40" x2="82" y2="40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="74" y1="55" x2="82" y2="55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="74" y1="70" x2="82" y2="70" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="74" y1="85" x2="82" y2="85" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M90 40 Q95 35, 90 30 Q85 25, 90 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M100 50 Q105 45, 100 40 Q95 35, 100 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M110 45 Q115 40, 110 35 Q105 30, 110 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),

  /* 11 — Moon and stars night */
  (props) => (
    <svg viewBox="12 18 75 82" fill="none" {...props}>
      <path d="M55 20 Q80 30, 85 60 Q80 90, 55 100 Q75 85, 75 60 Q75 35, 55 20Z" fill="currentColor" />
      <path d="M25 25 L27 32 L34 32 L28 37 L30 44 L25 39 L20 44 L22 37 L16 32 L23 32Z" fill="currentColor" />
      <path d="M40 65 L41.5 70 L46 70 L42.5 73 L44 78 L40 75 L36 78 L37.5 73 L34 70 L38.5 70Z" fill="currentColor" />
      <path d="M20 80 L21 84 L25 84 L22 86.5 L23 90 L20 88 L17 90 L18 86.5 L15 84 L19 84Z" fill="currentColor" />
      <circle cx="35" cy="40" r="1.2" fill="currentColor" />
      <circle cx="15" cy="55" r="1" fill="currentColor" />
      <circle cx="45" cy="50" r="1.2" fill="currentColor" />
      <circle cx="30" cy="95" r="1" fill="currentColor" />
      <circle cx="50" cy="90" r="1" fill="currentColor" />
    </svg>
  ),

  /* 12 — Foggy city silhouette */
  (props) => (
    <svg viewBox="0 32 132 74" fill="none" {...props}>
      <path d="M10 90 L10 55 L25 55 L25 45 L40 45 L40 90" fill="currentColor" />
      <path d="M42 90 L42 60 L55 60 L55 35 L65 35 L65 60 L75 60 L75 90" fill="currentColor" />
      <path d="M78 90 L78 50 L95 50 L95 40 L105 40 L105 50 L120 50 L120 90" fill="currentColor" />
      <rect x="15" y="60" width="5" height="6" rx="1" className="fill-[var(--bg-primary,#fff)]" />
      <rect x="15" y="72" width="5" height="6" rx="1" className="fill-[var(--bg-primary,#fff)]" />
      <rect x="48" y="65" width="5" height="6" rx="1" className="fill-[var(--bg-primary,#fff)]" />
      <rect x="58" y="42" width="5" height="6" rx="1" className="fill-[var(--bg-primary,#fff)]" />
      <rect x="85" y="56" width="5" height="6" rx="1" className="fill-[var(--bg-primary,#fff)]" />
      <rect x="85" y="68" width="5" height="6" rx="1" className="fill-[var(--bg-primary,#fff)]" />
      <rect x="108" y="56" width="5" height="6" rx="1" className="fill-[var(--bg-primary,#fff)]" />
      <path d="M0 75 Q30 70, 65 75 Q100 80, 130 75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M0 85 Q35 80, 70 85 Q105 90, 130 85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M0 95 Q25 92, 60 95 Q95 98, 130 95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      <line x1="0" y1="102" x2="130" y2="102" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),

  /* 13 — Sunrise over water */
  (props) => (
    <svg viewBox="3 22 112 78" fill="none" {...props}>
      <circle cx="60" cy="70" r="25" stroke="currentColor" strokeWidth="2" />
      <line x1="5" y1="70" x2="115" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="35" x2="60" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="42" x2="30" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="42" x2="90" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="58" x2="18" y2="55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="92" y1="58" x2="102" y2="55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 80 L45 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M50 78 L70 78" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d="M75 80 L95 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M35 88 L55 88" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M60 86 L80 86" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <path d="M20 95 L40 95" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <path d="M80 96 L100 96" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),

  /* 14 — Cloud blowing wind face */
  (props) => (
    <svg viewBox="3 8 135 58" fill="none" {...props}>
      <path d="M20 55 Q10 55, 8 45 Q5 32, 20 28 Q25 15, 42 14 Q58 10, 68 22 Q82 18, 88 30 Q96 40, 90 50 Q88 58, 78 60Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="36" r="3" fill="currentColor" />
      <circle cx="55" cy="34" r="3" fill="currentColor" />
      <path d="M62 44 Q68 38, 72 44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="78" cy="48" rx="5" ry="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M92 42 Q105 40, 118 42 Q125 44, 130 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M88 52 Q100 49, 115 52 Q122 54, 130 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M90 60 Q102 58, 112 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M118 35 Q122 32, 125 35 Q122 38, 118 35Z" fill="currentColor" />
      <path d="M128 55 Q132 52, 135 55 Q132 58, 128 55Z" fill="currentColor" />
    </svg>
  ),

  /* 15 — Umbrella */
  (props) => (
    <svg viewBox="5 5 128 115" fill="none" {...props}>
      <path d="M15 55 Q15 15, 65 10 Q115 15, 115 55" fill="currentColor" />
      <path d="M15 55 Q28 45, 40 55 Q52 45, 65 55 Q78 45, 90 55 Q102 45, 115 55" stroke="var(--bg, #fff)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="65" y1="10" x2="65" y2="100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 100 Q65 112, 55 112 Q45 112, 45 102" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="65" cy="8" r="2.5" fill="currentColor" />
      <circle cx="10" cy="30" r="2" fill="currentColor" />
      <circle cx="125" cy="25" r="1.5" fill="currentColor" />
      <circle cx="20" cy="75" r="2" fill="currentColor" />
      <circle cx="110" cy="70" r="1.5" fill="currentColor" />
      <circle cx="30" cy="100" r="2" fill="currentColor" />
      <circle cx="100" cy="95" r="1.5" fill="currentColor" />
    </svg>
  ),

  /* 16 — Snowman */
  (props) => (
    <svg viewBox="2 14 116 140" fill="none" {...props}>
      <circle cx="60" cy="120" r="30" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="60" cy="78" r="22" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="60" cy="46" r="16" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="47" y="18" width="26" height="16" rx="2" fill="currentColor" />
      <rect x="42" y="32" width="36" height="4" rx="1" fill="currentColor" />
      <circle cx="54" cy="42" r="2" fill="currentColor" />
      <circle cx="66" cy="42" r="2" fill="currentColor" />
      <path d="M60 47 L68 50 L60 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="52" cy="52" r="1.2" fill="currentColor" />
      <circle cx="56" cy="54" r="1.2" fill="currentColor" />
      <circle cx="60" cy="55" r="1.2" fill="currentColor" />
      <circle cx="64" cy="54" r="1.2" fill="currentColor" />
      <circle cx="68" cy="52" r="1.2" fill="currentColor" />
      <circle cx="60" cy="72" r="2.5" fill="currentColor" />
      <circle cx="60" cy="82" r="2.5" fill="currentColor" />
      <circle cx="60" cy="92" r="2.5" fill="currentColor" />
      <path d="M38 75 L15 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 60 L10 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 60 L8 62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M82 75 L105 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M105 60 L110 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M105 60 L112 62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 60 Q60 65, 76 60" fill="currentColor" />
    </svg>
  ),

  /* 17 — Rain boots in puddle */
  (props) => (
    <svg viewBox="2 22 84 94" fill="none" {...props}>
      <path d="M30 50 L30 90 Q30 100, 20 100 L15 100 Q8 100, 8 92 L8 88 Q8 82, 18 82 L30 82" fill="currentColor" />
      <path d="M55 50 L55 90 Q55 100, 65 100 L70 100 Q78 100, 78 92 L78 88 Q78 82, 68 82 L55 82" fill="currentColor" />
      <path d="M26 50 Q30 48, 34 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M51 50 Q55 48, 59 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="42" cy="104" rx="45" ry="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M25 95 Q22 88, 25 82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 94 Q63 87, 60 80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="25" cy="81" r="2" fill="currentColor" />
      <circle cx="60" cy="79" r="2" fill="currentColor" />
      <path d="M15 30 L13 45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M35 25 L33 40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M55 28 L53 43" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M72 32 L70 47" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),

  /* 18 — Hot coffee with steam */
  (props) => (
    <svg viewBox="26 2 86 118" fill="none" {...props}>
      <path d="M30 55 L30 105 Q30 115, 40 115 L80 115 Q90 115, 90 105 L90 55Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90 65 Q108 65, 108 80 Q108 95, 90 95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 62 L86 62" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M45 50 Q42 38, 48 28 Q52 20, 48 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 48 Q57 35, 63 25 Q67 15, 63 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M75 50 Q72 38, 78 28 Q82 20, 78 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  /* 19 — Kite in wind */
  (props) => (
    <svg viewBox="2 12 90 132" fill="none" {...props}>
      <path d="M60 15 L85 50 L60 95 L35 50Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="60" y1="15" x2="60" y2="95" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="35" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M60 95 Q50 110, 55 120 Q60 130, 50 140" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M55 108 Q50 105, 48 108 Q46 112, 50 114" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M52 125 Q47 122, 45 125 Q43 128, 47 130" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M10 30 L28 30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M5 50 L25 50" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M15 70 L30 70" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </svg>
  ),
];

/** Randomly chosen once at module load — stable for the entire app session */
const chosenIndex = Math.floor(Math.random() * icons.length);

export function WeatherIcon({ className }: { className?: string }) {
  const Icon = icons[chosenIndex];
  return <Icon className={className} />;
}
