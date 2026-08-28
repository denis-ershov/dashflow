import React, { useState } from 'react';
import { Modal } from '@/ui/overlays/Modal';
import { Input, Button } from '@/ui/primitives';
import { toast } from '@/ui/primitives/Toast';
import type { SpeedDialLink } from '@/core/storage';

export interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (link: Omit<SpeedDialLink, 'id'>) => void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();

    if (!cleanUrl) {
      setError('Введите адрес ссылки');
      return;
    }

    const finalUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
      ? cleanUrl
      : `https://${cleanUrl}`;

    const finalTitle = cleanTitle || (() => {
      try {
        return new URL(finalUrl).hostname.replace('www.', '');
      } catch {
        return 'Ссылка';
      }
    })();

    onAdd({
      title: finalTitle,
      url: finalUrl,
    });

    toast.success(`Ссылка «${finalTitle}» успешно добавлена!`);
    setTitle('');
    setUrl('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить быструю ссылку">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Название (необязательно)"
          placeholder="Например: GitHub или Документация"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Input
          label="URL-адрес сайта"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError('');
          }}
          error={error}
          required
        />

        <div className="flex items-center justify-end gap-3 mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            Добавить ссылку
          </Button>
        </div>
      </form>
    </Modal>
  );
};
