import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { CAPTURE_TICKET_MESSAGE, readCapturePage, type CapturePage } from '@/core/capture/model';
import { useTranslation } from '@/core/i18n';
import { asRecord } from '@/core/network/jsonReaders';
import { QuickCaptureForm } from '@/features/capture/QuickCaptureForm';
import '@/styles/globals.css';

const ticket = new URLSearchParams(location.search).get('ticket');
const pageContext = ticket
  ? browser.runtime.sendMessage({ type: CAPTURE_TICKET_MESSAGE, ticket })
      .then((value: unknown) => readCapturePage(asRecord(value).page))
      .catch(() => undefined)
      .finally(() => history.replaceState(null, '', location.pathname))
  : Promise.resolve(undefined);

function CaptureWindow() {
  const { language, t } = useTranslation();
  const [page, setPage] = useState<CapturePage>();
  const [checkingPage, setCheckingPage] = useState(Boolean(ticket));
  useEffect(() => {
    let active = true;
    void pageContext.then((context) => {
      if (!active) return;
      setPage(context);
      setCheckingPage(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `DashFlow · ${t('capture.title')}`;
  }, [language, t]);

  return <QuickCaptureForm page={page} checkingPage={checkingPage} onClose={() => window.close()} />;
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<CaptureWindow />);
