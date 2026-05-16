import { useCallback, useEffect, useState, type FC } from 'react';

import { ACTION_IDS } from '../shared/messages';
import { SettingsScreen } from './components/SettingsScreen';
import { SplashScreen } from './components/SplashScreen';
import { UsageScreen } from './components/UsageScreen';
import { t } from './i18n';
import { useUsage } from './hooks/useUsage';

type Screen = 'usage' | 'splash' | 'settings';

const ROTATION: ReadonlyArray<Screen> = ['usage', 'splash'];

const nextScreen = (current: Screen): Screen => {
  const idx = ROTATION.indexOf(current);
  if (idx === -1) return 'usage';
  return ROTATION[(idx + 1) % ROTATION.length] ?? 'usage';
};

const App: FC = () => {
  const { usage, error, settings, lastActionId, lastActionAt, requestRefresh } = useUsage();
  const [screen, setScreen] = useState<Screen>('usage');

  useEffect(() => {
    if (!settings.splashEnabled) {
      setScreen('usage');
      return;
    }
    const intervalMs = Math.max(5, settings.splashRotateSec) * 1000;
    const id = window.setInterval(() => {
      setScreen((current) => (current === 'settings' ? current : nextScreen(current)));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [settings.splashEnabled, settings.splashRotateSec]);

  useEffect(() => {
    if (!lastActionId || !lastActionAt) return;
    if (lastActionId === ACTION_IDS.cycleAnimation) {
      setScreen((current) => (current === 'settings' ? current : nextScreen(current)));
    }
  }, [lastActionId, lastActionAt]);

  const goSettings = useCallback(() => setScreen('settings'), []);
  const goUsage = useCallback(() => setScreen('usage'), []);

  const mood = usage?.mood ?? (settings.animationGroupOverride === 'auto' ? 'idle' : settings.animationGroupOverride);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-clawd-bg text-clawd-fg font-sans">
      <nav className="absolute top-3 right-4 z-10 flex gap-2">
        {screen !== 'settings' ? (
          <button
            type="button"
            onClick={goSettings}
            className="rounded-full border border-clawd-muted/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-clawd-muted hover:text-clawd-fg hover:border-clawd-fg/50"
          >
            {t('screen.settings')}
          </button>
        ) : (
          <button
            type="button"
            onClick={goUsage}
            className="rounded-full border border-clawd-muted/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-clawd-muted hover:text-clawd-fg hover:border-clawd-fg/50"
          >
            {t('screen.usage')}
          </button>
        )}
      </nav>

      <div className="h-full w-full">
        {screen === 'usage' && <UsageScreen usage={usage} settings={settings} />}
        {screen === 'splash' && <SplashScreen mood={mood} />}
        {screen === 'settings' && (
          <SettingsScreen settings={settings} error={error} onRefresh={requestRefresh} />
        )}
      </div>
    </main>
  );
};

export default App;
