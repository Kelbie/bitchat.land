export function getUserColor(userIdentifier: string, isDarkMode = false): string {
  function djb2(str: string): bigint {
    let hash = 5381n;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5n) + hash + BigInt(str.charCodeAt(i))) & 0xFFFFFFFFFFFFFFFFn;
    }
    return hash;
  }

  const hashValue = djb2(userIdentifier);
  let hue = Number(hashValue % 360n) / 360.0;

  const orange = 30.0 / 360.0;
  if (Math.abs(hue - orange) < 0.05) {
    hue = (hue + 0.12) % 1.0;
  }

  const saturation = isDarkMode ? 0.80 : 0.70;
  const brightness = isDarkMode ? 0.75 : 0.45;

  function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
    const c = b * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = b - c;

    let r = 0, g = 0, bl = 0;
    const sector = Math.floor(h * 6);
    switch (sector) {
      case 0: r = c; g = x; bl = 0; break;
      case 1: r = x; g = c; bl = 0; break;
      case 2: r = 0; g = c; bl = x; break;
      case 3: r = 0; g = x; bl = c; break;
      case 4: r = x; g = 0; bl = c; break;
      default: r = c; g = 0; bl = x; break;
    }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((bl + m) * 255)
    ];
  }

  const [r, g, b] = hsbToRgb(hue, saturation, brightness);
  return `rgb(${r}, ${g}, ${b})`;
}

export function colorForNostrPubkey(pubkeyHex: string, isDarkMode = false): string {
  const seed = "nostr:" + pubkeyHex.toLowerCase();
  return getUserColor(seed, isDarkMode);
}

export function parseRgb(rgb: string): [number, number, number] {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) throw new Error("Invalid rgb color");
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

export function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

export function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3 * 255 * 255);
}

export function hueFromColor(color: string): number {
  const [r, g, b] = parseRgb(color).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return h;
}
