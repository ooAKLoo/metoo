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

// ── Strategy 0: Parse Metoo export JSON (from browser console script) ──

function tryParseMetooExport(text: string): {
  board: XhsBoardInfo;
  notes: XhsNoteItem[];
} | null {
  if (!text.includes('"_metoo_xhs"')) return null;

  try {
    const data = JSON.parse(text.trim());
    if (!data._metoo_xhs) return null;

    const board: XhsBoardInfo = {
      boardName: data.board?.boardName || "小红书收藏",
      boardId: data.board?.boardId || `xhs_${Date.now()}`,
      noteCount: data.board?.noteCount || 0,
    };

    const notes: XhsNoteItem[] = (data.notes || [])
      .map((n: Record<string, string>) => ({
        id: n.id || "",
        title: n.title || "",
        cover: n.cover?.startsWith("//") ? `https:${n.cover}` : (n.cover || ""),
        author: n.author || "",
        likes: n.likes || "0",
        noteUrl: n.noteUrl || `/explore/${n.id}`,
      }))
      .filter((n: XhsNoteItem) => n.id && n.title);

    if (notes.length === 0) return null;

    return { board: { ...board, noteCount: notes.length }, notes };
  } catch {
    return null;
  }
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
  // Strategy 0: Metoo export JSON (from browser console script)
  const fromExport = tryParseMetooExport(html);
  if (fromExport && fromExport.notes.length > 0) return fromExport;

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
  // Metoo export JSON from browser console script
  if (text.includes('"_metoo_xhs"')) return true;

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

/** Browser console script — auto-scrolls XHS board page and collects all notes. */
export const XHS_COLLECT_SCRIPT = `(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const notes = new Map();
  let stale = 0;
  let lastHeight = 0;
  let iter = 0;
  const nameEl = document.querySelector('.board-info .name') || document.querySelector('.board-owner .title');
  const boardName = nameEl ? nameEl.textContent.trim().split('\\n')[0].trim() : '小红书收藏';
  let boardId = '';
  const um = location.href.match(/\\/board\\/([a-f0-9]+)/);
  if (um) boardId = um[1];
  const countEl = document.querySelector('.note-count');
  const cm = countEl?.textContent?.match(/(\\d+)/);
  const total = cm ? parseInt(cm[1]) : 0;
  console.log('🔍 开始收集「' + boardName + '」' + (total ? '（约 ' + total + ' 条）' : '') + '...');
  while (stale < 25 && iter < 500) {
    iter++;
    let found = 0;
    document.querySelectorAll('section.note-item, section[data-index]').forEach(el => {
      const a = el.querySelector('a[href*="/board/"], a[href*="/explore/"]');
      const href = a?.getAttribute('href') || '';
      const im = href.match(/\\/(board\\/[^/]+|explore)\\/([a-f0-9]+)/);
      if (!im || notes.has(im[2])) return;
      const id = im[2];
      notes.set(id, {
        id,
        title: (el.querySelector('[class*="title"] span') || el.querySelector('a.title span'))?.textContent?.trim() || '',
        cover: (el.querySelector('[class*="cover"] img') || el.querySelector('a.cover img'))?.getAttribute('src') || '',
        author: (el.querySelector('[class*="author"] [class*="name"]') || el.querySelector('a.author .name'))?.textContent?.trim() || '',
        likes: (el.querySelector('[class*="count"]') || el.querySelector('span.count'))?.textContent?.trim() || '0',
        noteUrl: '/explore/' + id,
      });
      found++;
    });
    if (found > 0) { stale = 0; console.log('📦 ' + notes.size + (total ? ' / ' + total : '') + ' 条'); }
    else stale++;
    const curHeight = document.documentElement.scrollHeight;
    if (curHeight > lastHeight) { lastHeight = curHeight; stale = Math.min(stale, 3); }
    window.scrollBy(0, 800);
    await delay(500);
    const ld = document.querySelector('.feeds-loading');
    if (ld && ld.offsetParent !== null) await delay(1500);
  }
  if (total > 0 && notes.size < total) {
    console.log('⚠️ 页面显示共 ' + total + ' 条，实际收集到 ' + notes.size + ' 条');
  }
  window.scrollTo(0, 0);
  const json = JSON.stringify({ _metoo_xhs: true, board: { boardName, boardId, noteCount: notes.size }, notes: [...notes.values()] });
  try {
    await navigator.clipboard.writeText(json);
    console.log('✅ ' + notes.size + ' 条笔记已复制到剪贴板');
    alert('✅ 已收集 ' + notes.size + ' 条笔记并复制到剪贴板\\n请到觅途粘贴');
  } catch {
    const t = document.createElement('textarea');
    t.value = json;
    t.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:200px;z-index:99999;font-size:11px';
    document.body.appendChild(t);
    t.select();
    alert('请手动全选复制文本框内容');
  }
})()`;
