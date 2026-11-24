import { useRef, useState } from 'react';
import { Modal } from '@/ui/overlays/Modal';
import { Button } from '@/ui/primitives';
import { Select } from '@/ui/primitives/Select';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from '@/core/i18n';
import { HubSettings } from '@/features/hub/HubSettings';
import { SPACE_PRESETS, type SpacePreset } from '@/core/storage';
import { finishOnboarding } from './onboarding';

interface OnboardingDialogProps {
  onComplete: () => void;
}

export function OnboardingDialog({ onComplete }: OnboardingDialogProps) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('');
  const [preset, setPreset] = useState<SpacePreset>('morning');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState(false);
  const busyRef = useRef(false);

  const finish = async (accepted: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setIssue(false);
    try {
      await finishOnboarding({ accepted, preset, city });
      onComplete();
    } catch {
      setIssue(true);
      busyRef.current = false;
      setBusy(false);
    }
  };

  const steps = [
    { title: t('onboarding.welcome'), description: t('onboarding.intro') },
    { title: t('onboarding.layoutTitle'), description: t('onboarding.layoutDescription') },
    { title: t('onboarding.hubTitle'), description: t('onboarding.hubDescription') },
  ];

  return (
    <Modal
      isOpen
      onClose={() => void finish(false)}
      title={steps[step]?.title}
      maxWidth="xl"
      className="max-h-[92vh]"
    >
      <div className="space-y-6">
        <p className="text-sm leading-6 text-fg-muted">{steps[step]?.description}</p>

        {step === 0 && (
          <div className="space-y-4">
            <Select
              label={t('onboarding.language')}
              value={language}
              onChange={(event) => {
                const next = event.currentTarget.value;
                if (next === 'ru' || next === 'en') {
                  void setLanguage(next).catch(() => setIssue(true));
                }
              }}
              options={[
                { value: 'ru', label: t('onboarding.russian') },
                { value: 'en', label: t('onboarding.english') },
              ]}
            />
            <label
              className="block space-y-1 text-xs font-medium text-fg"
              htmlFor="onboarding-city"
            >
              <span>{t('onboarding.city')}</span>
              <input
                id="onboarding-city"
                type="text"
                autoComplete="address-level2"
                maxLength={100}
                value={city}
                onChange={(event) => setCity(event.currentTarget.value)}
                placeholder={t('onboarding.cityPlaceholder')}
                className="min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-primary"
              />
              <span className="block text-xs font-normal text-fg-muted">
                {t('onboarding.cityPrivacy')}
              </span>
            </label>
          </div>
        )}

        {step === 1 && (
          <fieldset className="space-y-3">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              {t('onboarding.layoutTitle')}
            </legend>
            {SPACE_PRESETS.map((value) => (
              <label
                key={value}
                className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                  preset === value ? 'border-primary bg-primary/5' : 'border-line bg-canvas'
                }`}
              >
                <input
                  type="radio"
                  name="onboarding-preset"
                  value={value}
                  checked={preset === value}
                  onChange={() => setPreset(value)}
                  className="mt-1 accent-primary"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-fg">
                    {t(`onboarding.presets.${value}`)}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {t(`onboarding.presetDescriptions.${value}`)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {step === 2 && (
          <details className="group rounded-xl border border-line bg-canvas p-3">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-fg">
              {t('onboarding.configureHub')}
            </summary>
            <div className="pt-3">
              <HubSettings />
            </div>
          </details>
        )}

        {issue && (
          <p role="alert" className="text-sm text-danger">
            {t('onboarding.saveError')}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" disabled={busy} onClick={() => void finish(false)}>
            {t('onboarding.skip')}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>
                {t('onboarding.back')}
              </Button>
            )}
            {step < 2 ? (
              <Button disabled={busy} onClick={() => setStep(step + 1)}>
                {t('onboarding.continue')}
              </Button>
            ) : (
              <Button loading={busy} onClick={() => void finish(true)}>
                {t('onboarding.finish')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
