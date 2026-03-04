/**
 * Parse Xiaohongshu board page HTML (copied from DevTools).
 * Extracts note items from the DOM structure.
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

export function parseXhsHtml(html: string): {
  board: XhsBoardInfo;
  notes: XhsNoteItem[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Extract board info
  const boardNameEl = doc.querySelector(".board-info .name");
  const noteCountEl = doc.querySelector(".board-info .note-count");
  const boardName = boardNameEl?.textContent?.trim() || "小红书收藏";

  let noteCount = 0;
  const countMatch = noteCountEl?.textContent?.match(/笔记・(\d+)/);
  if (countMatch) noteCount = parseInt(countMatch[1], 10);

  // Try to extract board ID from links
  let boardId = "";
  const boardLink = doc.querySelector('a[href*="/board/"]');
  const boardIdMatch = boardLink?.getAttribute("href")?.match(/\/board\/([a-f0-9]+)/);
  if (boardIdMatch) boardId = boardIdMatch[1];
  if (!boardId) boardId = `xhs_${Date.now()}`;

  // Extract note items
  const sections = doc.querySelectorAll("section.note-item");
  const notes: XhsNoteItem[] = [];

  sections.forEach((section) => {
    const titleEl = section.querySelector("a.title span");
    const coverImg = section.querySelector("a.cover img") as HTMLImageElement | null;
    const authorNameEl = section.querySelector("a.author span.name");
    const likeCountEl = section.querySelector("span.count");
    const coverLink = section.querySelector("a.cover") as HTMLAnchorElement | null;

    const title = titleEl?.textContent?.trim() || "";
    if (!title) return; // Skip empty items

    const cover = coverImg?.getAttribute("src") || "";
    const author = authorNameEl?.textContent?.trim() || "";
    const likes = likeCountEl?.textContent?.trim() || "0";

    // Extract note ID from href
    let noteId = "";
    const href = coverLink?.getAttribute("href") || "";
    // Pattern: /board/{boardId}/{noteId}?... or /explore/{noteId}
    const noteIdMatch =
      href.match(/\/board\/[^/]+\/([a-f0-9]+)/) ||
      href.match(/\/explore\/([a-f0-9]+)/);
    if (noteIdMatch) noteId = noteIdMatch[1];
    if (!noteId) noteId = `note_${notes.length}`;

    notes.push({
      id: noteId,
      title,
      cover,
      author,
      likes,
      noteUrl: href,
    });
  });

  return {
    board: { boardName, boardId, noteCount: noteCount || notes.length },
    notes,
  };
}

/**
 * Detect if pasted text is Xiaohongshu HTML.
 * Checks for characteristic class names.
 */
export function isXhsHtml(text: string): boolean {
  return (
    text.includes("note-item") &&
    (text.includes("xiaohongshu") ||
      text.includes("xhscdn") ||
      text.includes("board-info") ||
      text.includes("data-v-79abd645"))
  );
}
