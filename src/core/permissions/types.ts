export type PermissionType = 'storage' | 'network' | 'bookmarks' | 'geolocation';

export interface PermissionGrant {
  widgetId: string;
  permissions: PermissionType[];
  grantedAt: string;
}

export type PermissionGrantsMap = Record<string, PermissionGrant>;

export interface PermissionDescription {
  type: PermissionType;
  titleKey: string;
  descriptionKey: string;
  isSensitive: boolean;
}

export const PERMISSION_DEFINITIONS: Record<PermissionType, PermissionDescription> = {
  storage: {
    type: 'storage',
    titleKey: 'permissions.storage.title',
    descriptionKey: 'permissions.storage.desc',
    isSensitive: false,
  },
  network: {
    type: 'network',
    titleKey: 'permissions.network.title',
    descriptionKey: 'permissions.network.desc',
    isSensitive: true,
  },
  bookmarks: {
    type: 'bookmarks',
    titleKey: 'permissions.bookmarks.title',
    descriptionKey: 'permissions.bookmarks.desc',
    isSensitive: true,
  },
  geolocation: {
    type: 'geolocation',
    titleKey: 'permissions.geolocation.title',
    descriptionKey: 'permissions.geolocation.desc',
    isSensitive: true,
  },
};
