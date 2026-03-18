use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

// --- Bilibili API response types ---

#[derive(Debug, Deserialize)]
struct BiliApiResponse {
    code: i32,
    message: String,
    data: Option<BiliData>,
}

#[derive(Debug, Deserialize)]
struct BiliData {
    info: Option<BiliInfo>,
    medias: Option<Vec<BiliMedia>>,
    has_more: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct BiliInfo {
    title: Option<String>,
    media_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct BiliMedia {
    id: Option<u64>,
    title: Option<String>,
    intro: Option<String>,
    cover: Option<String>,
    upper: Option<BiliUpper>,
    bvid: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BiliUpper {
    name: Option<String>,
}

// --- Frontend-facing types ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FavoriteItem {
    pub id: u64,
    pub title: String,
    pub intro: String,
    pub cover: String,
    pub author: String,
    pub bvid: String,
}

#[derive(Debug, Serialize)]
pub struct FetchResult {
    pub items: Vec<FavoriteItem>,
    pub has_more: bool,
    pub total: u32,
    pub title: String,
}

// --- Persistence types ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedFavoriteList {
    pub media_id: String,
    pub title: String,
    pub items: Vec<FavoriteItem>,
    pub saved_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FavoriteIndex {
    pub lists: Vec<FavoriteIndexEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FavoriteIndexEntry {
    pub media_id: String,
    pub title: String,
    pub count: usize,
    pub saved_at: String,
    #[serde(default)]
    pub preview_covers: Vec<String>,
}

/// Normalize cover URL: ensure https:// prefix
fn normalize_cover(url: &str) -> String {
    let s = url.trim();
    if s.is_empty() {
        return String::new();
    }
    if s.starts_with("//") {
        return format!("https:{}", s);
    }
    if s.starts_with("http://") {
        return s.replacen("http://", "https://", 1);
    }
    s.to_string()
}

/// Get the covers directory for storing downloaded cover images
fn covers_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path_resolver()
        .app_data_dir()
        .ok_or("Cannot resolve app data dir")?
        .join("favorites")
        .join("covers");
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create covers dir: {}", e))?;
    Ok(dir)
}

/// Strip the time-based signature from an XHS CDN URL.
/// `https://sns-webpic-qc.xhscdn.com/202603171718/hash/image_path`
/// → `https://sns-webpic-qc.xhscdn.com/image_path`
fn strip_xhs_cdn_signature(url: &str) -> Option<String> {
    // Find xhscdn.com in the URL, then skip the /{timestamp}/{hash}/ prefix
    let marker = "xhscdn.com/";
    let idx = url.find(marker)? + marker.len();
    let rest = &url[idx..]; // "202603171718/hash/image_path"

    // Skip timestamp segment (digits + /)
    let after_ts = rest.find('/')? + 1;
    let rest2 = &rest[after_ts..]; // "hash/image_path"

    // Skip hash segment (hex + /)
    let after_hash = rest2.find('/')? + 1;
    let image_path = &rest2[after_hash..]; // "image_path"

    if image_path.is_empty() {
        return None;
    }

    let domain_end = url.find(marker)? + marker.len() - 1; // up to and including the /
    Some(format!("{}{}", &url[..=domain_end], image_path))
}

/// Try to download bytes from a URL with appropriate headers.
async fn try_download(client: &reqwest::Client, url: &str, referer: &str) -> Option<Vec<u8>> {
    let resp = client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Referer", referer)
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let bytes = resp.bytes().await.ok()?;
    if bytes.len() < 100 {
        return None;
    }
    Some(bytes.to_vec())
}

/// Download a cover image to the local covers directory.
/// Returns the absolute path of the local file, or the original URL on failure.
async fn download_cover(url: &str, covers_dir: &Path) -> String {
    if url.is_empty() {
        return String::new();
    }

    // Derive a filename from the URL's last path segment
    let filename = url
        .split('?')
        .next()
        .unwrap_or(url)
        .rsplit('/')
        .next()
        .unwrap_or("cover");

    // Ensure the filename has an extension; default to .jpg
    let filename = if filename.contains('.') {
        filename.to_string()
    } else {
        format!("{}.jpg", filename)
    };

    let local_path = covers_dir.join(&filename);

    // Skip if already downloaded
    if local_path.exists() {
        return local_path.to_string_lossy().to_string();
    }

    let is_xhs = url.contains("xhscdn") || url.contains("xiaohongshu");
    let referer = if is_xhs {
        "https://www.xiaohongshu.com/"
    } else {
        "https://www.bilibili.com/"
    };

    let client = reqwest::Client::new();

    // Try the original URL first
    let bytes = if let Some(b) = try_download(&client, url, referer).await {
        b
    } else if is_xhs {
        // XHS CDN signature may have expired — try without the signature prefix
        if let Some(unsigned_url) = strip_xhs_cdn_signature(url) {
            if let Some(b) = try_download(&client, &unsigned_url, referer).await {
                b
            } else {
                return String::new();
            }
        } else {
            return String::new();
        }
    } else {
        return String::new();
    };

    match fs::write(&local_path, &bytes) {
        Ok(_) => local_path.to_string_lossy().to_string(),
        Err(_) => String::new(),
    }
}

/// Get the data directory for storing favorites
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path_resolver()
        .app_data_dir()
        .ok_or("Cannot resolve app data dir")?
        .join("favorites");
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create data dir: {}", e))?;
    Ok(dir)
}

// Use the Tauri 2 path API
trait PathResolver {
    fn path_resolver(&self) -> AppPathResolver;
}

struct AppPathResolver {
    handle: tauri::AppHandle,
}

impl PathResolver for tauri::AppHandle {
    fn path_resolver(&self) -> AppPathResolver {
        AppPathResolver {
            handle: self.clone(),
        }
    }
}

impl AppPathResolver {
    fn app_data_dir(&self) -> Option<PathBuf> {
        self.handle.path().app_data_dir().ok()
    }
}

#[tauri::command]
async fn fetch_favorites(media_id: String, page: u32) -> Result<FetchResult, String> {
    let url = format!(
        "https://api.bilibili.com/x/v3/fav/resource/list?media_id={}&pn={}&ps=20&platform=web",
        media_id, page
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Referer", "https://space.bilibili.com/")
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let body: BiliApiResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    if body.code == -412 {
        return Err("Rate limited (-412). Please wait and try again.".to_string());
    }

    if body.code != 0 {
        return Err(format!("Bilibili API error {}: {}", body.code, body.message));
    }

    let data = body.data.ok_or("No data in response")?;

    let title = data
        .info
        .as_ref()
        .and_then(|i| i.title.clone())
        .unwrap_or_default();

    let total = data
        .info
        .as_ref()
        .and_then(|i| i.media_count)
        .unwrap_or(0);

    let has_more = data.has_more.unwrap_or(false);

    let items: Vec<FavoriteItem> = data
        .medias
        .unwrap_or_default()
        .into_iter()
        .filter_map(|m| {
            Some(FavoriteItem {
                id: m.id?,
                title: m.title.unwrap_or_default(),
                intro: m.intro.unwrap_or_default(),
                cover: normalize_cover(&m.cover.unwrap_or_default()),
                author: m.upper.and_then(|u| u.name).unwrap_or_default(),
                bvid: m.bvid.unwrap_or_default(),
            })
        })
        .collect();

    Ok(FetchResult {
        items,
        has_more,
        total,
        title,
    })
}

#[tauri::command]
async fn save_favorite_list(
    app: tauri::AppHandle,
    media_id: String,
    title: String,
    items: Vec<FavoriteItem>,
) -> Result<(), String> {
    let dir = data_dir(&app)?;
    let covers = covers_dir(&app)?;

    // Download cover images locally
    let mut local_items = items.clone();
    for item in &mut local_items {
        if !item.cover.is_empty() && !item.cover.starts_with('/') {
            item.cover = download_cover(&item.cover, &covers).await;
        }
    }

    // Save list data
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let list = SavedFavoriteList {
        media_id: media_id.clone(),
        title: title.clone(),
        items: local_items.clone(),
        saved_at: now.clone(),
    };
    let list_path = dir.join(format!("{}.json", media_id));
    let json = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&list_path, json).map_err(|e| format!("Write error: {}", e))?;

    // Update index
    let index_path = dir.join("index.json");
    let mut index: FavoriteIndex = if index_path.exists() {
        let raw = fs::read_to_string(&index_path).unwrap_or_default();
        serde_json::from_str(&raw).unwrap_or(FavoriteIndex { lists: vec![] })
    } else {
        FavoriteIndex { lists: vec![] }
    };

    // Upsert entry
    let preview_covers: Vec<String> = local_items
        .iter()
        .map(|it| it.cover.clone())
        .filter(|c| !c.is_empty())
        .take(10)
        .collect();
    let entry = FavoriteIndexEntry {
        media_id: media_id.clone(),
        title,
        count: local_items.len(),
        saved_at: now,
        preview_covers,
    };
    if let Some(existing) = index.lists.iter_mut().find(|e| e.media_id == media_id) {
        *existing = entry;
    } else {
        index.lists.push(entry);
    }

    let index_json = serde_json::to_string_pretty(&index)
        .map_err(|e| format!("Serialize index error: {}", e))?;
    fs::write(&index_path, index_json).map_err(|e| format!("Write index error: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_favorite_list(
    app: tauri::AppHandle,
    media_id: String,
) -> Result<SavedFavoriteList, String> {
    let dir = data_dir(&app)?;
    let list_path = dir.join(format!("{}.json", media_id));
    if !list_path.exists() {
        return Err("List not found".to_string());
    }
    let raw = fs::read_to_string(&list_path).map_err(|e| format!("Read error: {}", e))?;
    let list: SavedFavoriteList =
        serde_json::from_str(&raw).map_err(|e| format!("Parse error: {}", e))?;

    Ok(list)
}

#[tauri::command]
async fn list_saved_favorites(app: tauri::AppHandle) -> Result<Vec<FavoriteIndexEntry>, String> {
    let dir = data_dir(&app)?;
    let index_path = dir.join("index.json");
    if !index_path.exists() {
        return Ok(vec![]);
    }
    let raw = fs::read_to_string(&index_path).map_err(|e| format!("Read error: {}", e))?;
    let mut index: FavoriteIndex =
        serde_json::from_str(&raw).unwrap_or(FavoriteIndex { lists: vec![] });

    // Backfill preview_covers for entries that lack them
    let mut dirty = false;
    for entry in &mut index.lists {
        if entry.preview_covers.is_empty() {
            let list_path = dir.join(format!("{}.json", entry.media_id));
            if let Ok(raw) = fs::read_to_string(&list_path) {
                if let Ok(list) = serde_json::from_str::<SavedFavoriteList>(&raw) {
                    entry.preview_covers = list.items.iter()
                        .map(|it| it.cover.clone())
                        .filter(|c| !c.is_empty())
                        .take(10)
                        .collect();
                    dirty = true;
                }
            }
        }
    }
    if dirty {
        if let Ok(json) = serde_json::to_string_pretty(&index) {
            let _ = fs::write(&index_path, json);
        }
    }

    Ok(index.lists)
}

#[tauri::command]
async fn delete_favorite_list(app: tauri::AppHandle, media_id: String) -> Result<(), String> {
    let dir = data_dir(&app)?;

    // Read list to find local cover paths before deleting
    let list_path = dir.join(format!("{}.json", media_id));
    if list_path.exists() {
        if let Ok(raw) = fs::read_to_string(&list_path) {
            if let Ok(list) = serde_json::from_str::<SavedFavoriteList>(&raw) {
                for item in &list.items {
                    // Only delete files that are local paths (start with '/')
                    if item.cover.starts_with('/') {
                        let _ = fs::remove_file(&item.cover);
                    }
                }
            }
        }
        fs::remove_file(&list_path).map_err(|e| format!("Delete error: {}", e))?;
    }

    // Update index
    let index_path = dir.join("index.json");
    if index_path.exists() {
        let raw = fs::read_to_string(&index_path).unwrap_or_default();
        let mut index: FavoriteIndex =
            serde_json::from_str(&raw).unwrap_or(FavoriteIndex { lists: vec![] });
        index.lists.retain(|e| e.media_id != media_id);
        let json = serde_json::to_string_pretty(&index)
            .map_err(|e| format!("Serialize error: {}", e))?;
        fs::write(&index_path, json).map_err(|e| format!("Write error: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn merge_favorite_lists(
    app: tauri::AppHandle,
    source_ids: Vec<String>,
    new_title: String,
) -> Result<String, String> {
    let dir = data_dir(&app)?;

    // Collect all items from source lists, dedup by bvid
    let mut merged_items: Vec<FavoriteItem> = Vec::new();
    let mut seen_bvids = std::collections::HashSet::new();

    for source_id in &source_ids {
        let list_path = dir.join(format!("{}.json", source_id));
        if !list_path.exists() {
            continue;
        }
        let raw = fs::read_to_string(&list_path)
            .map_err(|e| format!("Read error: {}", e))?;
        let list: SavedFavoriteList =
            serde_json::from_str(&raw).map_err(|e| format!("Parse error: {}", e))?;
        for item in list.items {
            if seen_bvids.insert(item.bvid.clone()) {
                merged_items.push(item);
            }
        }
    }

    if merged_items.is_empty() {
        return Err("No items to merge".to_string());
    }

    // Generate a new media_id for the merged list
    let now = chrono::Local::now();
    let new_media_id = format!("merged_{}", now.format("%Y%m%d%H%M%S"));
    let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();

    let list = SavedFavoriteList {
        media_id: new_media_id.clone(),
        title: new_title.clone(),
        items: merged_items.clone(),
        saved_at: now_str.clone(),
    };
    let list_path = dir.join(format!("{}.json", new_media_id));
    let json = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&list_path, json).map_err(|e| format!("Write error: {}", e))?;

    // Update index
    let index_path = dir.join("index.json");
    let mut index: FavoriteIndex = if index_path.exists() {
        let raw = fs::read_to_string(&index_path).unwrap_or_default();
        serde_json::from_str(&raw).unwrap_or(FavoriteIndex { lists: vec![] })
    } else {
        FavoriteIndex { lists: vec![] }
    };

    let preview_covers: Vec<String> = merged_items
        .iter()
        .map(|it| it.cover.clone())
        .filter(|c| !c.is_empty())
        .take(10)
        .collect();
    index.lists.push(FavoriteIndexEntry {
        media_id: new_media_id.clone(),
        title: new_title,
        count: merged_items.len(),
        saved_at: now_str,
        preview_covers,
    });

    let index_json = serde_json::to_string_pretty(&index)
        .map_err(|e| format!("Serialize index error: {}", e))?;
    fs::write(&index_path, index_json).map_err(|e| format!("Write index error: {}", e))?;

    Ok(new_media_id)
}

#[tauri::command]
async fn save_image_to_downloads(
    app: tauri::AppHandle,
    data: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    let downloads = app
        .path()
        .download_dir()
        .map_err(|e| format!("Cannot resolve downloads dir: {}", e))?;
    fs::create_dir_all(&downloads).map_err(|e| format!("Cannot create dir: {}", e))?;
    let path = downloads.join(&filename);
    fs::write(&path, &data).map_err(|e| format!("Write error: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            fetch_favorites,
            save_favorite_list,
            load_favorite_list,
            list_saved_favorites,
            delete_favorite_list,
            merge_favorite_lists,
            save_image_to_downloads
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
