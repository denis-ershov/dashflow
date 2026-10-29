import React, { useState } from 'react';
import { Modal } from '@/ui/overlays/Modal';
import { Input, Button } from '@/ui/primitives';
import { toast } from '@/ui/primitives/Toast';
import type { SpeedDialLink } from '@/core/storage';
import { useTranslation, type TranslationKey } from '@/core/i18n';

export interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (link: Omit<SpeedDialLink, 'id'>) => void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();

    if (!cleanUrl) {
      setError('speedDial.errors.empty');
      return;
    }

    const finalUrl =
      cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
        ? cleanUrl
        : `https://${cleanUrl}`;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(finalUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        setError('speedDial.errors.protocol');
        return;
      }
    } catch {
      setError('speedDial.errors.invalid');
      return;
    }

    const finalTitle =
      cleanTitle || parsedUrl.hostname.replace(/^www\./, '') || t('speedDial.defaultTitle');

    onAdd({
      title: finalTitle,
      url: finalUrl,
    });

    toast.success(t('speedDial.added', { title: finalTitle }));
    setTitle('');
    setUrl('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('speedDial.modalTitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('speedDial.titleField')}
          placeholder={t('speedDial.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Input
          label={t('speedDial.urlField')}
          placeholder="https://example.com"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          error={error ? t(error) : undefined}
          required
        />

        <div className="flex items-center justify-end gap-3 mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {t('speedDial.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
