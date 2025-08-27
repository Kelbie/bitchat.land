export const IMAGE_URL_REGEX = /https?:\/\/[^\s]+\.(?:png|jpe?g|gif|bmp|webp|svg)/i;

export function hasImageUrl(text: string | null | undefined): boolean {
  if (!text) return false;
  return IMAGE_URL_REGEX.test(text);
}

export function extractImageUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(IMAGE_URL_REGEX);
  return match ? match[0] : null;
}
