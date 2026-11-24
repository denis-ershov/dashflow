import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useTranslation } from '@/core/i18n';
import { readReminderNotification } from '@/core/reminders/reminder';
import { ReminderList } from '@/features/reminders/ReminderList';
import '@/styles/globals.css';

const occurrence = readReminderNotification(
  new URLSearchParams(location.search).get('notification') ?? '',
);

function RemindersPage() {
  const { language, t } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `DashFlow · ${t('reminders.due')}`;
  }, [language, t]);

  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 sm:p-8">
      <a
        href="./newtab.html"
        className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        {t('reminders.back')}
      </a>
      <h1 className="text-2xl font-semibold">DashFlow</h1>
      <ReminderList standalone occurrence={occurrence} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<RemindersPage />);
