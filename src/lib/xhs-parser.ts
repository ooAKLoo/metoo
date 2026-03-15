/**
 * Parse Xiaohongshu board page HTML.
 * Strategy:
 *  1. Try extracting from __INITIAL_STATE__ JSON (most reliable, full-page paste)
 *  2. Fall back to DOM selectors (partial HTML from DevTools Elements copy)
 */

export interface XhsNoteItem {
  id: string;
  title: string;
  cover: string;
  author: string;
  likes: string;
  noteUrl: string;
}

export interface XhsBoardInfo {
  boardName: string;
  boardId: string;
  noteCount: number;
}

// ── Strategy 1: Extract from __INITIAL_STATE__ embedded JSON ──

function tryParseInitialState(html: string): {
  board: XhsBoardInfo;
  notes: XhsNoteItem[];
} | null {
  // Match window.__INITIAL_STATE__ = {...}
  const stateMatch = html.match(
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*(?:<\/script>|;\s*\n)/
  );
  if (!stateMatch) return null;

  let raw = stateMatch[1];
  // XHS uses `undefined` in their JSON — replace with null for valid JSON
  raw = raw.replace(/\bundefined\b/g, "null");

  let state: Record<string, unknown>;
  try {
    state = JSON.parse(raw);
  } catch {
    // Try cleaning up common issues: trailing commas, etc.
    try {
      raw = raw.replace(/,\s*([\]}])/g, "$1");
      state = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Navigate to board data — XHS uses different keys across versions
  const boardState =
    (state.board as Record<string, unknown>) ??
    (state.boardFeed as Record<string, unknown>) ??
    null;

  if (!boardState) return null;

  const boardInfo =
    (boardState.boardInfo as Record<string, unknown>) ??
    (boardState.board as Record<string, unknown>) ??
    boardState;

  const boardName =
    (boardInfo.name as string) ??
    (boardInfo.boardName as string) ??
    "小红书收藏";
  const boardId =
    (boardInfo.id as string) ??
    (boardInfo.boardId as string) ??
    `xhs_${Date.now()}`;

  // Notes array
  const notesList =
    (boardState.notes as unknown[]) ??
    (boardState.noteList as unknown[]) ??
    (boardState.feeds as unknown[]) ??
    [];

  const notes: XhsNoteItem[] = [];
  for (const raw of notesList) {
    const note = raw as Record<string, unknown>;
    // XHS nests note data under `noteCard` or directly
    const card = (note.noteCard as Record<string, unknown>) ?? note;

    const id =
      (note.id as string) ??
      (note.noteId as string) ??
      (card.noteId as string) ??
      `note_${notes.length}`;

    const title =
      (card.title as string) ??
      (card.displayTitle as string) ??
      "";
    if (!title) continue;

    // Cover image
    let cover = "";
    const coverObj = card.cover as Record<string, unknown> | undefined;
    if (coverObj) {
      const infoList = coverObj.infoList as { url: string }[] | undefined;
      if (infoList?.length) {
        cover = infoList[infoList.length - 1].url;
      } else {
        cover = (coverObj.url as string) ?? (coverObj.urlDefault as string) ?? "";
      }
    }

    // Author
    const userObj = card.user as Record<string, unknown> | undefined;
    const author =
      (userObj?.nickName as string) ??
      (userObj?.nickname as string) ??
      "";

    // Likes
    const interactInfo = card.interactInfo as Record<string, unknown> | undefined;
    const likes =
      (interactInfo?.likedCount as string) ??
      (card.likes as string) ??
      "0";

    notes.push({
      id,
      title,
      cover: cover.startsWith("//") ? `https:${cover}` : cover,
      author,
      likes,
      noteUrl: `/explore/${id}`,
    });
  }

  if (notes.length === 0) return null;

  return {
    board: { boardName, boardId, noteCount: notes.length },
    notes,
  };
}

// ── Strategy 2: DOM-based parsing (DevTools copy-paste) ──

function parseDom(html: string): {
  board: XhsBoardInfo;
  notes: XhsNoteItem[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Board info
  const boardNameEl =
    doc.querySelector(".board-info .name") ??
    doc.querySelector('[class*="board"] [class*="name"]') ??
    doc.querySelector("h1");
  const noteCountEl =
    doc.querySelector(".board-info .note-count") ??
    doc.querySelector('[class*="note-count"]');
  const boardName = boardNameEl?.textContent?.trim() || "小红书收藏";

  let noteCount = 0;
  const countText = noteCountEl?.textContent || "";
  const countMatch = countText.match(/(\d+)/);
  if (countMatch) noteCount = parseInt(countMatch[1], 10);

  // Board ID
  let boardId = "";
  const boardLink = doc.querySelector('a[href*="/board/"]');
  const boardIdMatch = boardLink?.getAttribute("href")?.match(/\/board\/([a-f0-9]+)/);
  if (boardIdMatch) boardId = boardIdMatch[1];

  // Try from URL patterns anywhere in the HTML
  if (!boardId) {
    const idInHtml = html.match(/\/board\/([a-f0-9]{24})/);
    if (idInHtml) boardId = idInHtml[1];
  }
  if (!boardId) boardId = `xhs_${Date.now()}`;

  // Note items — try multiple selector patterns
  let sections = doc.querySelectorAll("section.note-item");
  if (sections.length === 0) {
    sections = doc.querySelectorAll('[class*="note-item"]');
  }
  if (sections.length === 0) {
    sections = doc.querySelectorAll("section[data-note-id]");
  }

  const notes: XhsNoteItem[] = [];

  sections.forEach((section) => {
    const titleEl =
      section.querySelector("a.title span") ??
      section.querySelector('[class*="title"] span') ??
      section.querySelector('[class*="title"]');
    const coverImg =
      (section.querySelector("a.cover img") ??
        section.querySelector('[class*="cover"] img')) as HTMLImageElement | null;
    const authorNameEl =
      section.querySelector("a.author span.name") ??
      section.querySelector('[class*="author"] [class*="name"]') ??
      section.querySelector('[class*="author"]');
    const likeCountEl =
      section.querySelector("span.count") ??
      section.querySelector('[class*="like"] [class*="count"]') ??
      section.querySelector('[class*="count"]');
    const coverLink =
      (section.querySelector("a.cover") ??
        section.querySelector('[class*="cover"] a') ??
        section.querySelector("a[href]")) as HTMLAnchorElement | null;

    const title = titleEl?.textContent?.trim() || "";
    if (!title) return;

    const cover =
      coverImg?.getAttribute("src") ??
      coverImg?.dataset.src ??
      coverImg?.getAttribute("data-lazyload-src") ??
      "";
    const author = authorNameEl?.textContent?.trim() || "";
    const likes = likeCountEl?.textContent?.trim() || "0";

    let noteId = "";
    const href = coverLink?.getAttribute("href") || "";
    const noteIdMatch =
      href.match(/\/board\/[^/]+\/([a-f0-9]+)/) ||
      href.match(/\/explore\/([a-f0-9]+)/) ||
      href.match(/\/discovery\/item\/([a-f0-9]+)/);
    if (noteIdMatch) noteId = noteIdMatch[1];

    // Try data attribute
    if (!noteId) {
      noteId =
        section.getAttribute("data-note-id") ??
        section.getAttribute("id") ??
        `note_${notes.length}`;
    }

    notes.push({ id: noteId, title, cover, author, likes, noteUrl: href });
  });

  return {
    board: { boardName, boardId, noteCount: noteCount || notes.length },
    notes,
  };
}

// ── Public API ──

export function parseXhsHtml(html: string): {
  board: XhsBoardInfo;
  notes: XhsNoteItem[];
} {
  // Strategy 1: __INITIAL_STATE__ JSON (most reliable for full-page paste)
  const fromState = tryParseInitialState(html);
  if (fromState && fromState.notes.length > 0) return fromState;

  // Strategy 2: DOM selectors
  return parseDom(html);
}

/**
 * Detect if pasted text is likely Xiaohongshu HTML.
 */
export function isXhsHtml(text: string): boolean {
  // Must look like HTML (contains at least one tag)
  if (!/<[a-z][\s>]/i.test(text)) return false;

  return (
    text.includes("note-item") ||
    text.includes("__INITIAL_STATE__") ||
    text.includes("xiaohongshu.com") ||
    text.includes("xhscdn") ||
    text.includes("board-info") ||
    text.includes("data-v-79abd645") ||
    (text.includes("xhs") && text.includes("board"))
  );
}
