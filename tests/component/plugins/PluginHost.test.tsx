import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PluginHost } from '@/widgets/sandbox/PluginHost';

describe('PluginHost Sandbox Frame', () => {
  it('должен рендерить iframe с sandbox="allow-scripts" без allow-same-origin', () => {
    const { container } = render(<PluginHost pluginId="weather_widget" instanceId="inst-1" />);

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe?.getAttribute('sandbox')).not.toContain('allow-same-origin');
  });
});
