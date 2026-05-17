import { useCallback, useEffect, useState, type FC } from 'react';

import { SettingsScreen } from './components/SettingsScreen';
import { SplashScreen } from './components/SplashScreen';
import { UsageScreen } from './components/UsageScreen';
import { t } from './i18n';
import { useUsage } from './hooks/useUsage';

type Screen = 'usage' | 'splash' | 'settings';

const App: FC = () => {
  const { usage, error, settings, requestRefresh } = useUsage();
  const [screen, setScreen] = useState<Screen>('splash');

  const mood = usage?.mood ?? (settings.animationGroupOverride === 'auto' ? 'idle' : settings.animationGroupOverride);

  // Mood drives the screen: idle → splash, anything active → usage.
  // Switching to settings is manual and persists until the user navigates away.
  useEffect(() => {
    if (!settings.splashEnabled) {
      setScreen((s) => (s === 'settings' ? s : 'usage'));
      return;
    }
    const target: Screen = mood === 'idle' ? 'splash' : 'usage';
    setScreen((s) => (s === 'settings' ? s : target));
  }, [mood, settings.splashEnabled]);

  const goSettings = useCallback(() => setScreen('settings'), []);
  const goBack = useCallback(() => {
    const target: Screen = mood === 'idle' ? 'splash' : 'usage';
    setScreen(settings.splashEnabled ? target : 'usage');
  }, [mood, settings.splashEnabled]);

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
            onClick={goBack}
            className="rounded-full border border-clawd-muted/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-clawd-muted hover:text-clawd-fg hover:border-clawd-fg/50"
          >
            {t('screen.back')}
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
