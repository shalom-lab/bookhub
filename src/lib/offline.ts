import { get, set, del, keys } from 'idb-keyval';

/**
 * 规范化 URL，移除查询参数，确保缓存键稳定
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // 移除查询参数，只保留路径
    return urlObj.origin + urlObj.pathname;
  } catch (e) {
    return url;
  }
}

export async function saveBookOffline(url: string, data: ArrayBuffer | Blob) {
  const key = `book_${normalizeUrl(url)}`;
  try {
    // 存储为 Blob 通常在 IndexedDB 中更高效
    const blob = data instanceof Blob ? data : new Blob([data]);
    await set(key, blob);
    return true;
  } catch (error) {
    console.error('Failed to save book offline', error);
    if ((error as any).name === 'QuotaExceededError') {
      alert('存储空间不足，无法缓存此书籍。');
    }
    return false;
  }
}

export async function getBookOffline(url: string): Promise<Blob | null> {
  const key = `book_${normalizeUrl(url)}`;
  try {
    const data = await get(key);
    return data || null;
  } catch (error) {
    console.error('Failed to get book offline', error);
    return null;
  }
}

export async function removeBookOffline(url: string) {
  const key = `book_${normalizeUrl(url)}`;
  try {
    await del(key);
    return true;
  } catch (error) {
    console.error('Failed to remove book offline', error);
    return false;
  }
}

export async function getCachedBooksList(): Promise<string[]> {
  try {
    const allKeys = await keys();
    return allKeys
      .filter((k) => typeof k === 'string' && k.startsWith('book_'))
      .map((k) => (k as string).replace('book_', ''));
  } catch (error) {
    console.error('Failed to get cached books list', error);
    return [];
  }
}

export function isUrlCached(url: string, cachedList: string[]): boolean {
  return cachedList.includes(normalizeUrl(url));
}
