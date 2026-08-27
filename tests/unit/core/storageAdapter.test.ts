import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { StorageQuotaExceededError, StorageError } from '@/core/storage/errors';

describe('StorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Базовые операции get / set / remove', () => {
    it('должен сохранять и считывать значение из localStorage при отсутствии chrome.storage', async () => {
      await StorageAdapter.set(STORAGE_KEYS.APP_SETTINGS, { language: 'ru', theme: 'deep-blue' });
      const value = await StorageAdapter.get(STORAGE_KEYS.APP_SETTINGS, null);

      expect(value).toEqual({ language: 'ru', theme: 'deep-blue' });
    });

    it('должен возвращать defaultValue при отсутствии сохраненного ключа', async () => {
      const value = await StorageAdapter.get('non_existent_key', { fallback: true });
      expect(value).toEqual({ fallback: true });
    });

    it('должен удалять значение по ключу', async () => {
      await StorageAdapter.set('test_key', 'test_value');
      await StorageAdapter.remove('test_key');
      const value = await StorageAdapter.get('test_key', null);

      expect(value).toBeNull();
    });

    it('должен очищать все сохраненные данные при clear()', async () => {
      await StorageAdapter.set('k1', 1);
      await StorageAdapter.set('k2', 2);
      await StorageAdapter.clear();

      expect(await StorageAdapter.get('k1', null)).toBeNull();
      expect(await StorageAdapter.get('k2', null)).toBeNull();
    });
  });

  describe('Обработка ошибок и переполнения квоты (Правило 25)', () => {
    it('должен выбрасывать StorageQuotaExceededError при превышении лимита хранилища на запись', async () => {
      vi.spyOn(StorageAdapter, 'isQuotaError').mockReturnValue(true);
      vi.spyOn(StorageAdapter, 'writeRaw').mockRejectedValue(
        new Error('QuotaExceededError: DOM Exception 22'),
      );

      await expect(StorageAdapter.set('huge_key', 'data')).rejects.toThrow(
        StorageQuotaExceededError,
      );
    });

    it('должен выбрасывать StorageError при общей ошибке записи', async () => {
      vi.spyOn(StorageAdapter, 'isQuotaError').mockReturnValue(false);
      vi.spyOn(StorageAdapter, 'writeRaw').mockRejectedValue(new Error('Disk IO failure'));

      await expect(StorageAdapter.set('key', 'data')).rejects.toThrow(StorageError);
    });

    it('при ошибке чтения должен безопасно возвращать defaultValue без падения', async () => {
      localStorage.setItem('corrupted_json', '{not a valid json]');
      const value = await StorageAdapter.get('corrupted_json', 'safe_default');

      expect(value).toBe('safe_default');
    });
  });
});
