import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemMonitorWidget } from '@/widgets/built-in/SystemMonitorWidget/SystemMonitorWidget';
import { systemMonitorManifest } from '@/widgets/built-in/SystemMonitorWidget/manifest';

describe('SystemMonitorWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(systemMonitorManifest.id).toBe('systemMonitor');
    expect(systemMonitorManifest.surface).toBe('panel');
    expect(systemMonitorManifest.nameKey).toBe('widgets.systemMonitor');
    expect(systemMonitorManifest.category).toBe('developer');
  });

  it('должен отображать состояние сети и батареи', () => {
    render(
      <SystemMonitorWidget
        instanceId="sys-1"
        settings={{ showBattery: true, showNetwork: true }}
      />,
    );

    expect(screen.getByText('Сеть')).toBeInTheDocument();
    expect(screen.getByText('Батарея')).toBeInTheDocument();
    expect(screen.getByText(/подключено|офлайн/i)).toBeInTheDocument();
  });
});
