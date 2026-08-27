import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IframeWidget } from '@/widgets/built-in/IframeWidget/IframeWidget';
import { iframeManifest } from '@/widgets/built-in/IframeWidget/manifest';

describe('IframeWidget Component & Manifest', () => {
  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(iframeManifest.id).toBe('iframe');
    expect(iframeManifest.surface).toBe('panel');
    expect(iframeManifest.nameKey).toBe('widgets.iframe');
    expect(iframeManifest.permissions).toContain('network');
  });

  it('должен рендерить iframe с безопасным sandbox без allow-same-origin', () => {
    render(
      <IframeWidget
        instanceId="iframe-1"
        settings={{ url: 'https://wxt.dev', zoom: 100 }}
      />,
    );

    const iframe = screen.getByTitle(/embed/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://wxt.dev');

    const sandbox = iframe.getAttribute('sandbox');
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('должен блокировать небезопасные схемы url (javascript:, chrome:, file:) и показывать предупреждение', () => {
    render(
      <IframeWidget
        instanceId="iframe-1"
        settings={{ url: 'javascript:alert(1)', zoom: 100 }}
      />,
    );

    expect(screen.queryByTitle(/embed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/недопустимый или небезопасный url/i)).toBeInTheDocument();
  });
});
