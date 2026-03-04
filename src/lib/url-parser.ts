/**
 * Parse Bilibili favorite list URL to extract media_id.
 * Supports formats:
 * - https://space.bilibili.com/xxx/favlist?fid=123456
 * - https://www.bilibili.com/medialist/detail/ml123456
 * - Direct media_id number
 */
export function parseBiliFavUrl(input: string): string | null {
  const trimmed = input.trim();

  // Direct number
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // favlist?fid=xxx
  const fidMatch = trimmed.match(/[?&]fid=(\d+)/);
  if (fidMatch) return fidMatch[1];

  // medialist/detail/mlXXX
  const mlMatch = trimmed.match(/medialist\/detail\/ml(\d+)/);
  if (mlMatch) return mlMatch[1];

  // medialist/detail/XXX (without ml prefix)
  const detailMatch = trimmed.match(/medialist\/detail\/(\d+)/);
  if (detailMatch) return detailMatch[1];

  return null;
}
