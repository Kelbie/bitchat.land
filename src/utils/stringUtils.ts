/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 */
export function capitalizeFirst(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalizes the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns The string with each word's first letter capitalized
 */
export function capitalizeWords(str: string): string {
  if (!str || str.length === 0) return str;
  return str
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
}

/**
 * Converts a string to title case (capitalizes first letter of each word)
 * @param str - The string to convert to title case
 * @returns The string in title case
 */
export function toTitleCase(str: string): string {
  return capitalizeWords(str);
}
