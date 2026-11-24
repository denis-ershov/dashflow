import React, { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { browser } from 'wxt/browser';
import {
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { HUB_CONNECTION_KEY, readHubConnection } from '@/core/hub/model';
import { useTranslation } from '@/core/i18n';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import { Button, Input } from '@/ui/primitives';
import {
  resolveSafeAdminUrl,
  sendNexusMessage,
  type NexusChatMessage,
} from './nexusChatApi';
import type { NexusChatSettings } from './types';

interface HubFallbackConfig {
  endpointUrl?: string;
  bearerToken?: string;
}

type WidgetErrorState =
  | { kind: 'quota_paused'; message: string; resetAt?: string }
  | { kind: 'offline' | 'unauthorized' | 'error'; message: string };

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `nexus-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const NexusChatWidget: React.FC<Partial<WidgetProps<NexusChatSettings>>> = ({ settings }) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const [hubFallback, setHubFallback] = useState<HubFallbackConfig>({});
  const [messages, setMessages] = useState<NexusChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<WidgetErrorState | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const storageLocal = browser?.storage?.local;
    if (!storageLocal?.get) return undefined;

    void storageLocal
      .get(HUB_CONNECTION_KEY)
      .then((values) => {
        if (!active) return;
        const conn = readHubConnection(values?.[HUB_CONNECTION_KEY]);
        if (conn) {
          setHubFallback({ endpointUrl: conn.origin, bearerToken: conn.token });
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading, errorState]);

  const effectiveEndpointUrl = settings?.chatEndpointUrl?.trim() || hubFallback.endpointUrl || '';
  const effectiveBearerToken = settings?.bearerToken?.trim() || hubFallback.bearerToken;
  const effectiveModel = settings?.model?.trim() || 'nexus-default';
  const safeAdminUrl = resolveSafeAdminUrl(settings?.adminUrl, effectiveEndpointUrl);

  const quickPrompts = [
    t('nexusChat.promptPlan'),
    t('nexusChat.promptMail'),
    t('nexusChat.promptLinear'),
  ];

  const dispatchMessages = async (nextMessages: NexusChatMessage[], clearInput: boolean) => {
    if (busyRef.current) return;
    if (!effectiveEndpointUrl) {
      setErrorState({ kind: 'error', message: t('nexusChat.missingEndpoint') });
      return;
    }

    busyRef.current = true;
    setIsLoading(true);
    setErrorState(null);
    setMessages(nextMessages);
    if (clearInput) {
      setInputValue('');
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendNexusMessage(
        nextMessages,
        {
          endpointUrl: effectiveEndpointUrl,
          bearerToken: effectiveBearerToken,
          adminUrl: settings?.adminUrl,
          model: effectiveModel,
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      if (result.ok) {
        const assistantMessage: NexusChatMessage = {
          id: createMessageId(),
          role: 'assistant',
          content: result.reply,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (result.kind === 'quota_paused') {
        setErrorState({
          kind: 'quota_paused',
          message: result.message || t('nexusChat.quotaPausedDescription'),
          resetAt: result.resetAt,
        });
      } else if (result.kind === 'offline') {
        setErrorState({ kind: 'offline', message: t('nexusChat.offlineError') });
      } else if (result.kind === 'unauthorized') {
        setErrorState({ kind: 'unauthorized', message: t('nexusChat.unauthorizedError') });
      } else if (result.code === 'INVALID_URL') {
        setErrorState({ kind: 'error', message: t('nexusChat.invalidEndpoint') });
      } else if (result.code === 'INVALID_RESPONSE') {
        setErrorState({ kind: 'error', message: t('nexusChat.invalidResponse') });
      } else if (result.code === 'HTTP_ERROR') {
        setErrorState({
          kind: 'error',
          message: result.message || t('nexusChat.httpError', { status: result.status ?? '' }),
        });
      } else {
        setErrorState({
          kind: 'error',
          message: t('nexusChat.genericError'),
        });
      }
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSendText = (rawText: string, clearInput: boolean) => {
    const trimmed = rawText.trim();
    if (!trimmed || busyRef.current) return;

    const userMessage: NexusChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    void dispatchMessages([...messages, userMessage], clearInput);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSendText(inputValue, true);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSendText(inputValue, true);
    }
  };

  const handleRetry = () => {
    if (messages.length === 0 || busyRef.current) return;
    void dispatchMessages(messages, false);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    busyRef.current = false;
    setIsLoading(false);
    setMessages([]);
    setErrorState(null);
  };

  return (
    <section
      aria-label={t('nexusChat.regionLabel')}
      className="flex h-full min-h-0 min-w-0 flex-col gap-2 p-2 sm:p-3"
    >
      {messages.length > 0 && (
        <div className="flex shrink-0 items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('nexusChat.clearLabel')}
            onClick={handleClear}
            disabled={isLoading}
            icon={<Trash2 aria-hidden="true" className="size-4" />}
            className="min-h-11 px-3 text-xs text-fg-muted"
          >
            {t('nexusChat.clearLabel')}
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2.5 pe-1">
        {messages.length === 0 && !isLoading ? (
          <div className="glass-card flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="flex size-11 items-center justify-center rounded-sm border border-line bg-surface text-primary">
              <Sparkles aria-hidden="true" className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-fg">{t('nexusChat.emptyTitle')}</h3>
              <p className="text-xs text-fg-muted max-w-xs">{t('nexusChat.emptyDescription')}</p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendText(prompt, false)}
                  className="glass-pill min-h-11 px-4 py-2 text-xs font-medium text-fg hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-2.5" aria-label={t('nexusChat.messagesLabel')}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <li
                  key={msg.id}
                  className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}
                >
                  <span className="px-1 text-xs font-medium text-fg-muted">
                    {isUser ? t('nexusChat.userRole') : t('nexusChat.assistantRole')}
                  </span>
                  <div
                    className={cn(
                      'max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm wrap-anywhere whitespace-pre-wrap',
                      isUser
                        ? 'bg-primary text-primary-fg shadow-1'
                        : 'glass-card text-fg',
                    )}
                  >
                    {msg.content}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="glass-card flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-fg-muted"
          >
            <span
              aria-hidden="true"
              className="size-4 shrink-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
            />
            <span>{t('nexusChat.loading')}</span>
          </div>
        )}

        {errorState?.kind === 'quota_paused' && (
          <div
            role="alert"
            className="glass-card border-warning/40 bg-warning/10 p-3.5 space-y-2.5 text-fg"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-warning mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="text-sm font-semibold text-fg">
                  {t('nexusChat.quotaPausedTitle')}
                </h4>
                <p className="text-xs text-fg-muted wrap-anywhere">{errorState.message}</p>
                {errorState.resetAt && (
                  <p className="text-xs text-fg-muted">
                    {t('nexusChat.quotaPausedReset', { resetAt: errorState.resetAt })}
                  </p>
                )}
              </div>
            </div>
            {safeAdminUrl && (
              <a
                href={safeAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-pill inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs font-medium text-primary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{t('nexusChat.adminLinkLabel')}</span>
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            )}
          </div>
        )}

        {errorState && errorState.kind !== 'quota_paused' && (
          <div
            role="alert"
            className="glass-card border-danger/30 bg-danger/10 p-3 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {errorState.kind === 'offline' ? (
                <WifiOff aria-hidden="true" className="size-4 shrink-0 text-danger" />
              ) : (
                <MessageSquare aria-hidden="true" className="size-4 shrink-0 text-danger" />
              )}
              <p className="text-xs text-fg wrap-anywhere">{errorState.message}</p>
            </div>
            {messages.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={isLoading}
                icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
                className="min-h-11"
              >
                {t('nexusChat.retry')}
              </Button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex min-w-0 shrink-0 items-center gap-2 pt-1">
        <div className="min-w-0 flex-1">
          <Input
            id={`${idPrefix}-input`}
            variant="glass"
            aria-label={t('nexusChat.inputLabel')}
            placeholder={t('nexusChat.inputPlaceholder')}
            value={inputValue}
            disabled={isLoading}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleInputKeyDown}
            className="min-h-11"
          />
        </div>
        <Button
          type="submit"
          size="icon"
          variant="primary"
          aria-label={t('nexusChat.sendLabel')}
          disabled={!inputValue.trim() || isLoading}
          loading={isLoading}
          icon={<Send aria-hidden="true" className="size-4" />}
          className="shrink-0 min-w-11 min-h-11"
        />
      </form>
    </section>
  );
};
