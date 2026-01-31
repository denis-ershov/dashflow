import { DashboardGrid } from '@/components/DashboardGrid';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useUIStore } from '@/stores';

function App() {
  const isEditing = useUIStore((s) => s.isEditing);
  const setEditing = useUIStore((s) => s.setEditing);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-4 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border-b border-[var(--color-border)] z-50">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">DashFlow</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Open settings"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setEditing(!isEditing)}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>
      </header>
      <SettingsPanel />
      <div className="pt-14">
        <DashboardGrid />
      </div>
    </main>
  );
}

export default App;
