/**
 * Базовый класс ошибки хранилища DashFlow
 */
export class StorageError extends Error {
  public override readonly name: string = 'StorageError';
  public readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Ошибка превышения квоты дискового пространства или лимита chrome.storage / localStorage
 */
export class StorageQuotaExceededError extends StorageError {
  public override readonly name: string = 'StorageQuotaExceededError';

  constructor(originalError?: unknown) {
    super('Превышена квота дискового хранилища браузера. Освободите место.', originalError);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Ошибка сериализации или десериализации JSON данных
 */
export class StorageSerializationError extends StorageError {
  public override readonly name: string = 'StorageSerializationError';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
