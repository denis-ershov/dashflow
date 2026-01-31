# Widget Plugin System

Dynamic widget registration with multiple instances per type.

---

## 1. WidgetDefinition Interface

```ts
interface WidgetMetadata {
  type: string;        // Unique id (e.g. 'clock')
  name: string;        // Display name
  description?: string;
  icon?: string;
  author?: string;
}

interface WidgetDefaultSize {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

interface WidgetDefinition<Config = Record<string, unknown>> {
  metadata: WidgetMetadata;
  component: ComponentType<WidgetComponentProps<Config>>;
  defaultSize: WidgetDefaultSize;
  SettingsPanel?: ComponentType<WidgetSettingsProps<Config>>;  // Optional
  defaultConfig?: Config;
}

interface WidgetComponentProps<Config> {
  instanceId: string;
  config: Config;
}

interface WidgetSettingsProps<Config> {
  instanceId: string;
  config: Config;
  onConfigChange: (updates: Partial<Config>) => void;
}
```

---

## 2. Widget Registry

```ts
// src/widgets/registry.ts
registerWidget(definition: WidgetDefinition): void
unregisterWidget(type: string): boolean
getWidget(type: string): WidgetDefinition | undefined
hasWidget(type: string): boolean
listWidgets(): WidgetDefinition[]
getWidgetTypes(): string[]
```

Widgets register at module load. Import plugins early (e.g. in `main.tsx`):

```ts
import '@/widgets/plugins';
```

---

## 3. Widget Instance Model

```ts
interface WidgetInstance {
  id: string;      // Instance id (unique)
  type: string;    // Registry key
  config: Record<string, unknown>;
  version: number;
}
```

**Creating instances:**

```ts
import { createInstance, getDefaultSize } from '@/widgets';

const instance = createInstance('clock', crypto.randomUUID());
const { w, h } = getDefaultSize('clock') ?? { w: 4, h: 2 };
```

Multiple instances of the same type: each has its own `id` and `config`.

---

## 4. Example: Clock Widget Registration

```tsx
// src/widgets/plugins/clock.tsx
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetComponentProps, WidgetSettingsProps } from '../types';

interface ClockConfig {
  showSeconds?: boolean;
  showDate?: boolean;
}

function ClockComponent({ config }: WidgetComponentProps<ClockConfig>) {
  // ...
}

function ClockSettingsPanel({ config, onConfigChange }: WidgetSettingsProps<ClockConfig>) {
  return (
    <label>
      <input
        type="checkbox"
        checked={config.showSeconds ?? true}
        onChange={(e) => onConfigChange({ showSeconds: e.target.checked })}
      />
      Show seconds
    </label>
  );
}

const clockDefinition: WidgetDefinition<ClockConfig> = {
  metadata: { type: 'clock', name: 'Clock', description: 'Displays time and date' },
  component: ClockComponent,
  defaultSize: { w: 4, h: 2, minW: 2, minH: 1 },
  SettingsPanel: ClockSettingsPanel,
  defaultConfig: { showSeconds: true, showDate: true },
};

registerWidget(clockDefinition);
```

---

## Adding a New Widget

1. Create `src/widgets/plugins/my-widget.tsx`
2. Define metadata, component, defaultSize, optional SettingsPanel
3. Call `registerWidget(definition)`
4. Add `import './my-widget'` to `plugins/index.ts`
