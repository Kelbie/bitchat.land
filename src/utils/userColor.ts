export function colorForPeerSeed(seed: string, isDark: boolean) {
  // --- djb2 (UInt64) with wrap at 2^64 like Kotlin's ULong ---
  const enc = typeof TextEncoder !== 'undefined'
    ? new TextEncoder()
    : { encode: (s) => new Uint8Array(Buffer.from(s, 'utf8')) };
  const bytes = enc.encode(seed);

  let hash = 5381n;
  const MASK64 = 0xFFFFFFFFFFFFFFFFn; // keep math in UInt64 domain
  for (let i = 0; i < bytes.length; i++) {
    const b = BigInt(bytes[i]);              // 0..255
    hash = (((hash << 5n) + hash) + b) & MASK64; // hash*33 + b, then wrap
  }

  // Hue fraction in [0,1) from hash % 360
  let hueFrac = Number(hash % 360n) / 360.0;

  // Avoid orange (~30°) reserved for "self"
  const orange = 30.0 / 360.0;
  if (Math.abs(hueFrac - orange) < 0.05) {      // same 0.05 window
    hueFrac = (hueFrac + 0.12) % 1.0;           // same +0.12 shift
  }

  // Saturation/Value match the platform logic
  const saturation = isDark ? 0.50 : 0.70;
  const value = isDark ? 0.85 : 0.35;

  // Convert HSV → RGB for CSS use
  const hueDeg = hueFrac * 360.0;
  const { r, g, b } = hsvToRgb(hueDeg, saturation, value);
  const hex = rgbToHex(r, g, b);

  return {
    hsv: { h: hueDeg, s: saturation, v: value }, // h in [0,360)
    rgb: { r, g, b },                            // 0..255
    hex,                                         // "#RRGGBB"
    css: hex                                     // convenience alias
  };
}

// --- helpers ---
function hsvToRgb(h, s, v) {
  // h in [0,360), s,v in [0,1]
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0, gp = 0, bp = 0;
  if (h < 60)       { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else              { rp = c; gp = 0; bp = x; }

  const r = Math.round((rp + m) * 255);
  const g = Math.round((gp + m) * 255);
  const b = Math.round((bp + m) * 255);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}