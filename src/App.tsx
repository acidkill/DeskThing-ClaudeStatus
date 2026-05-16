import type { FC } from 'react';

const App: FC = () => {
  return (
    <div className="w-screen h-screen bg-clawd-bg text-clawd-fg font-sans flex flex-col items-center justify-center gap-3">
      <p className="text-4xl font-bold tracking-tight">Clawdmeter</p>
      <p className="text-sm text-clawd-muted">scaffold online — waiting for server</p>
    </div>
  );
};

export default App;
