import { useMemo } from "react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { TAG_MAP, TAG_KEYWORDS } from "../lib/tag-dictionary";

export interface TagEntry {
  category: string;
  emoji: string;
  count: number;
}

/** Extract food/activity tags from item titles */
export function extractTagsFromTitle(title: string): string[] {
  const matched = new Set<string>();
  for (const keyword of TAG_KEYWORDS) {
    if (title.includes(keyword)) {
      matched.add(TAG_MAP[keyword].category);
    }
  }
  return Array.from(matched);
}

/** Check if a title matches a specific tag category */
export function titleMatchesTag(title: string, tag: string): boolean {
  for (const keyword of TAG_KEYWORDS) {
    if (TAG_MAP[keyword].category === tag && title.includes(keyword)) {
      return true;
    }
  }
  return false;
}

export function useTagExtraction() {
  const items = useFavoriteStore((s) => s.items);

  return useMemo(() => {
    const agg = new Map<string, { emoji: string; count: number }>();

    for (const item of items) {
      const tags = extractTagsFromTitle(item.title);
      for (const cat of tags) {
        const existing = agg.get(cat);
        if (existing) {
          existing.count++;
        } else {
          // Find the emoji for this category
          const entry = Object.values(TAG_MAP).find((v) => v.category === cat);
          agg.set(cat, { emoji: entry?.emoji ?? "🏷️", count: 1 });
        }
      }
    }

    const entries: TagEntry[] = Array.from(agg.entries())
      .map(([category, data]) => ({
        category,
        emoji: data.emoji,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    return entries;
  }, [items]);
}
