import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { parseBiliFavUrl } from "../lib/url-parser";
import { extractLocations, type ExtractedLocation } from "../lib/location-extractor";
import { parseXhsHtml } from "../lib/xhs-parser";

export type SourcePlatform = "bilibili" | "xiaohongshu";

export interface FavoriteItem {
  id: number;
  title: string;
  intro: string;
  cover: string;
  author: string;
  bvid: string; // B站 bvid 或小红书 noteId
  locations: ExtractedLocation[];
  source: SourcePlatform;
  likes?: string; // 小红书点赞数
}

interface FetchResult {
  items: {
    id: number;
    title: string;
    intro: string;
    cover: string;
    author: string;
    bvid: string;
  }[];
  has_more: boolean;
  total: number;
  title: string;
}

export interface SavedListEntry {
  media_id: string;
  title: string;
  count: number;
  saved_at: string;
  preview_covers: string[];
}

interface SavedFavoriteList {
  media_id: string;
  title: string;
  items: {
    id: number;
    title: string;
    intro: string;
    cover: string;
    author: string;
    bvid: string;
  }[];
  saved_at: string;
}

type FetchStatus = "idle" | "fetching" | "done" | "error";
type InputMode = "bilibili" | "xhs-paste";

interface FavoriteState {
  url: string;
  inputMode: InputMode;
  mediaId: string | null;
  listTitle: string;
  items: FavoriteItem[];
  status: FetchStatus;
  error: string | null;
  progress: { current: number; total: number };
  savedLists: SavedListEntry[];
  mergeMode: boolean;

  setUrl: (url: string) => void;
  setInputMode: (mode: InputMode) => void;
  setMergeMode: (mode: boolean) => void;
  fetchAll: () => Promise<void>;
  importFromXhsHtml: (html: string) => Promise<void>;
  reset: () => void;

  loadSavedLists: () => Promise<void>;
  loadList: (mediaId: string) => Promise<void>;
  deleteList: (mediaId: string) => Promise<void>;
  mergeLists: (sourceIds: string[], newTitle: string) => Promise<void>;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  url: "",
  inputMode: "bilibili",
  mediaId: null,
  listTitle: "",
  items: [],
  status: "idle",
  error: null,
  progress: { current: 0, total: 0 },
  savedLists: [],
  mergeMode: false,

  setUrl: (url) => set({ url }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setMergeMode: (mode) => set({ mergeMode: mode }),

  fetchAll: async () => {
    const { url } = get();
    const mediaId = parseBiliFavUrl(url);
    if (!mediaId) {
      set({ error: "无法识别收藏夹链接，请粘贴正确的 B 站收藏夹 URL", status: "error" });
      return;
    }

    set({
      status: "fetching",
      error: null,
      items: [],
      mediaId,
      progress: { current: 0, total: 0 },
    });

    let page = 1;
    let allItems: FavoriteItem[] = [];
    let hasMore = true;
    let listTitle = "";
    let retryDelay = 300;

    while (hasMore) {
      try {
        const result = await invoke<FetchResult>("fetch_favorites", {
          mediaId,
          page,
        });

        if (page === 1) {
          listTitle = result.title;
          set({ listTitle, progress: { current: 0, total: result.total } });
        }

        const enriched: FavoriteItem[] = result.items.map((item) => ({
          ...item,
          locations: extractLocations(item.title, item.intro),
          source: "bilibili" as const,
        }));

        allItems = [...allItems, ...enriched];
        set({
          items: allItems,
          progress: { current: allItems.length, total: result.total },
        });

        hasMore = result.has_more;
        page++;
        retryDelay = 300;

        if (hasMore) {
          await new Promise((r) => setTimeout(r, retryDelay));
        }
      } catch (err) {
        const errMsg = String(err);
        if (errMsg.includes("-412")) {
          retryDelay = Math.min(retryDelay + 200, 2000);
          await new Promise((r) => setTimeout(r, retryDelay));
          continue;
        }
        set({ error: errMsg, status: "error" });
        return;
      }
    }

    // Data is ready — unblock UI immediately
    set({ status: "done" });

    // Optimistically update savedLists so Left Panel renders now
    set((state) => ({
      savedLists: [
        ...state.savedLists.filter((l) => l.media_id !== mediaId),
        {
          media_id: mediaId,
          title: listTitle,
          count: allItems.length,
          saved_at: new Date().toISOString().replace("T", " ").slice(0, 19),
          preview_covers: allItems.map((i) => i.cover).filter(Boolean).slice(0, 10),
        },
      ],
    }));

    // Persist metadata (instant), then download covers in background
    const rawItems = allItems.map(({ locations: _l, source: _s, likes: _k, ...rest }) => rest);
    invoke("save_favorite_list", { mediaId, title: listTitle, items: rawItems })
      .then(() => invoke("download_covers_background", { mediaId }))
      .then(() => {
        get().loadSavedLists();
        if (get().mediaId === mediaId) get().loadList(mediaId);
      })
      .catch((e) => console.warn("Failed to persist:", e));
  },

  importFromXhsHtml: async (html: string) => {
    set({ status: "fetching", error: null });
    try {
      const { board, notes } = parseXhsHtml(html);

      if (notes.length === 0) {
        set({ error: "未能从 HTML 中解析到笔记，请确认复制了完整的页面内容", status: "error" });
        return;
      }

      const mediaId = `xhs_${board.boardId}`;
      const listTitle = board.boardName;

      const items: FavoriteItem[] = notes.map((note, i) => ({
        id: parseInt(note.id.slice(-8), 16) || i + 1, // Convert hex tail to number
        title: note.title,
        intro: "", // XHS doesn't expose intro in board page
        cover: note.cover,
        author: note.author,
        bvid: note.id,
        locations: extractLocations(note.title, ""),
        source: "xiaohongshu" as const,
        likes: note.likes,
      }));

      // Data is ready — unblock UI immediately
      set({
        mediaId,
        listTitle,
        items,
        status: "done",
        error: null,
        url: "",
        progress: { current: items.length, total: board.noteCount },
      });

      // Optimistically update savedLists so Left Panel renders now
      set((state) => ({
        savedLists: [
          ...state.savedLists.filter((l) => l.media_id !== mediaId),
          {
            media_id: mediaId,
            title: listTitle,
            count: items.length,
            saved_at: new Date().toISOString().replace("T", " ").slice(0, 19),
            preview_covers: items.map((i) => i.cover).filter(Boolean).slice(0, 10),
          },
        ],
      }));

      // Persist metadata (instant), then download covers in background
      const rawItems = items.map(({ locations: _l, source: _s, likes: _k, ...rest }) => rest);
      invoke("save_favorite_list", { mediaId, title: listTitle, items: rawItems })
        .then(() => invoke("download_covers_background", { mediaId }))
        .then(() => {
          get().loadSavedLists();
          if (get().mediaId === mediaId) get().loadList(mediaId);
        })
        .catch((e) => console.warn("Failed to persist XHS:", e));
    } catch (err) {
      set({ error: `解析失败: ${err}`, status: "error" });
    }
  },

  reset: () =>
    set({
      url: "",
      mediaId: null,
      listTitle: "",
      items: [],
      status: "idle",
      error: null,
      progress: { current: 0, total: 0 },
    }),

  loadSavedLists: async () => {
    try {
      const lists = await invoke<SavedListEntry[]>("list_saved_favorites");
      set({ savedLists: lists });
    } catch {
      set({ savedLists: [] });
    }
  },

  loadList: async (mediaId: string) => {
    try {
      const saved = await invoke<SavedFavoriteList>("load_favorite_list", { mediaId });
      const isXhs = mediaId.startsWith("xhs_");
      const enriched: FavoriteItem[] = saved.items.map((item) => ({
        ...item,
        locations: extractLocations(item.title, item.intro),
        source: (isXhs ? "xiaohongshu" : "bilibili") as SourcePlatform,
      }));
      set({
        mediaId,
        listTitle: saved.title,
        items: enriched,
        status: "done",
        error: null,
        url: "",
        progress: { current: enriched.length, total: enriched.length },
      });
    } catch (err) {
      set({ error: String(err), status: "error" });
    }
  },

  deleteList: async (mediaId: string) => {
    try {
      await invoke("delete_favorite_list", { mediaId });
      const { mediaId: currentId } = get();
      if (currentId === mediaId) {
        get().reset();
      }
      get().loadSavedLists();
    } catch (err) {
      console.warn("Delete failed:", err);
    }
  },

  mergeLists: async (sourceIds: string[], newTitle: string) => {
    try {
      const newMediaId = await invoke<string>("merge_favorite_lists", {
        sourceIds,
        newTitle,
      });
      await get().loadSavedLists();
      await get().loadList(newMediaId);
    } catch (err) {
      set({ error: String(err), status: "error" });
    }
  },
}));
