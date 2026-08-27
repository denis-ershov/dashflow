import React, { useState } from 'react';
import { Palette, Image as ImageIcon, Code2 } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { Modal } from '@/ui/overlays/Modal';
import { PresetGrid } from './PresetGrid';
import { WallpaperPicker } from './WallpaperPicker';
import { CustomCssEditor } from './CustomCssEditor';

export interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'presets' | 'wallpaper' | 'css';

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('presets');

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'presets', label: 'Темы', icon: <Palette className="w-4 h-4" /> },
    { id: 'wallpaper', label: 'Обои', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'css', label: 'CSS', icon: <Code2 className="w-4 h-4" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Внешний вид & Темы"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Вкладки */}
        <div className="flex items-center gap-1 p-1 bg-canvas rounded-md border border-line">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-sm transition-all duration-normal ease-expo cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'bg-surface text-primary shadow-1'
                    : 'text-fg-muted hover:text-fg hover:bg-surface/50',
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Контент активной вкладки */}
        <div>
          {activeTab === 'presets' && <PresetGrid />}
          {activeTab === 'wallpaper' && <WallpaperPicker />}
          {activeTab === 'css' && <CustomCssEditor />}
        </div>
      </div>
    </Modal>
  );
};
