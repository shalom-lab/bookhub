import { get, set, del, keys } from 'idb-keyval';

export async function saveBookOffline(url: string, data: ArrayBuffer) {
  try {
    await set(`book_${url}`, data);
    return true;
  } catch (error) {
    console.error('Failed to save book offline', error);
    return false;
  }
}

export async function getBookOffline(url: string): Promise<ArrayBuffer | null> {
  try {
    const data = await get(`book_${url}`);
    return data || null;
  } catch (error) {
    console.error('Failed to get book offline', error);
    return null;
  }
}

export async function removeBookOffline(url: string) {
  try {
    await del(`book_${url}`);
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
