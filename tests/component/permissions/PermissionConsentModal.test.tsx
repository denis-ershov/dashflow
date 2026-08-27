import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionConsentModal } from '@/features/permissions/PermissionConsentModal';
import { useI18nStore } from '@/core/i18n';

describe('PermissionConsentModal Component', () => {
  beforeEach(() => {
    useI18nStore.setState({ language: 'ru' });
  });

  it('должен рендерить запрашиваемые права и вызывать onAllow при согласии', () => {
    const handleAllow = vi.fn();
    const handleDeny = vi.fn();

    render(
      <PermissionConsentModal
        isOpen={true}
        widgetId="rss_reader"
        widgetTitle="RSS Reader"
        author="DashFlow Team"
        permissions={['network', 'storage']}
        onAllow={handleAllow}
        onDeny={handleDeny}
      />,
    );

    expect(screen.getByText('RSS Reader')).toBeInTheDocument();
    expect(screen.getByText(/Сетевые запросы/i)).toBeInTheDocument();
    expect(screen.getByText(/Локальное хранилище/i)).toBeInTheDocument();

    const allowBtn = screen.getByRole('button', { name: /Разрешить и добавить/i });
    fireEvent.click(allowBtn);

    expect(handleAllow).toHaveBeenCalledTimes(1);
  });

  it('должен вызывать onDeny при отклонении', () => {
    const handleAllow = vi.fn();
    const handleDeny = vi.fn();

    render(
      <PermissionConsentModal
        isOpen={true}
        widgetId="bookmarks_widget"
        widgetTitle="Bookmarks"
        permissions={['bookmarks']}
        onAllow={handleAllow}
        onDeny={handleDeny}
      />,
    );

    const denyBtn = screen.getByRole('button', { name: /Отклонить/i });
    fireEvent.click(denyBtn);

    expect(handleDeny).toHaveBeenCalledTimes(1);
  });
});
