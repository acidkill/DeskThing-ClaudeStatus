import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/log', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  redact: (s: string) => s,
}));

const { spawnMock, platformMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  platformMock: vi.fn(() => 'linux'),
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, default: { ...actual, platform: platformMock }, platform: platformMock };
});

type FakeChildOptions = {
  exitCode?: number | null;
  stderr?: string;
  errorOnSpawn?: Error;
  delayMs?: number;
};

const makeFakeChild = (opts: FakeChildOptions = {}) => {
  const emitter = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { end: (chunk?: string) => void };
    kill: (sig?: string) => boolean;
  };
  emitter.stdout = new EventEmitter();
  emitter.stderr = new EventEmitter();
  emitter.stdin = { end: vi.fn() };
  emitter.kill = vi.fn();

  setTimeout(() => {
    if (opts.errorOnSpawn) {
      emitter.emit('error', opts.errorOnSpawn);
      return;
    }
    if (opts.stderr) emitter.stderr.emit('data', Buffer.from(opts.stderr, 'utf8'));
    emitter.emit('close', opts.exitCode ?? 0);
  }, opts.delayMs ?? 0);

  return emitter;
};

beforeEach(() => {
  spawnMock.mockReset();
  platformMock.mockReset();
  platformMock.mockReturnValue('linux');
  delete process.env.WAYLAND_DISPLAY;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('resolveBackend', () => {
  it('returns off without probing when preference is off', async () => {
    const { resolveBackend } = await import('../../server/keys');
    const backend = await resolveBackend('off');
    expect(backend).toBe('off');
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('returns the explicit backend when probe succeeds', async () => {
    spawnMock.mockImplementation(() => makeFakeChild({ exitCode: 0 }));
    const { resolveBackend } = await import('../../server/keys');
    const backend = await resolveBackend('xdotool');
    expect(backend).toBe('xdotool');
    expect(spawnMock).toHaveBeenCalledWith('xdotool', ['--version'], expect.any(Object));
  });

  it('falls back to off when explicit backend probe fails', async () => {
    spawnMock.mockImplementation(() => makeFakeChild({ exitCode: 1 }));
    const { resolveBackend } = await import('../../server/keys');
    const backend = await resolveBackend('xdotool');
    expect(backend).toBe('off');
  });

  it('auto on darwin probes osascript', async () => {
    platformMock.mockReturnValue('darwin');
    spawnMock.mockImplementation((cmd: string) =>
      makeFakeChild({ exitCode: cmd === 'osascript' ? 0 : 1 }),
    );
    const { resolveBackend } = await import('../../server/keys');
    expect(await resolveBackend('auto')).toBe('osascript');
  });

  it('auto on win32 probes powershell', async () => {
    platformMock.mockReturnValue('win32');
    spawnMock.mockImplementation((cmd: string) =>
      makeFakeChild({ exitCode: cmd === 'powershell' ? 0 : 1 }),
    );
    const { resolveBackend } = await import('../../server/keys');
    expect(await resolveBackend('auto')).toBe('powershell');
  });

  it('auto on X11 linux prefers xdotool over wtype', async () => {
    platformMock.mockReturnValue('linux');
    spawnMock.mockImplementation(() => makeFakeChild({ exitCode: 0 }));
    const { resolveBackend } = await import('../../server/keys');
    expect(await resolveBackend('auto')).toBe('xdotool');
  });

  it('auto on Wayland linux prefers wtype over xdotool', async () => {
    platformMock.mockReturnValue('linux');
    process.env.WAYLAND_DISPLAY = 'wayland-0';
    spawnMock.mockImplementation(() => makeFakeChild({ exitCode: 0 }));
    const { resolveBackend } = await import('../../server/keys');
    expect(await resolveBackend('auto')).toBe('wtype');
  });

  it('auto returns off when no backend probes successfully', async () => {
    platformMock.mockReturnValue('linux');
    spawnMock.mockImplementation(() => makeFakeChild({ exitCode: 1 }));
    const { resolveBackend } = await import('../../server/keys');
    expect(await resolveBackend('auto')).toBe('off');
  });
});

describe('createKeyDispatcher', () => {
  it('press is a no-op when backend resolves to off', async () => {
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('off');
    expect(dispatcher.backend).toBe('off');
    spawnMock.mockClear();
    await dispatcher.press({ key: 'space' });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('osascript dispatch shells out with System Events keystroke for space', async () => {
    platformMock.mockReturnValue('darwin');
    const calls: Array<{ cmd: string; args: string[] }> = [];
    spawnMock.mockImplementation((cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return makeFakeChild({ exitCode: 0 });
    });
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('osascript');
    expect(dispatcher.backend).toBe('osascript');
    await dispatcher.press({ key: 'space' });
    const dispatchCall = calls.find((c) => c.args[1]?.includes('keystroke " "'));
    expect(dispatchCall).toBeDefined();
  });

  it('osascript dispatch uses key code 48 + shift for tab+shift', async () => {
    platformMock.mockReturnValue('darwin');
    const calls: Array<{ cmd: string; args: string[] }> = [];
    spawnMock.mockImplementation((cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return makeFakeChild({ exitCode: 0 });
    });
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('osascript');
    await dispatcher.press({ key: 'tab', shift: true });
    const dispatchCall = calls.find((c) =>
      c.args.some((a) => a.includes('key code 48') && a.includes('shift down')),
    );
    expect(dispatchCall).toBeDefined();
  });

  it('xdotool dispatch uses space arg', async () => {
    const calls: Array<{ cmd: string; args: string[] }> = [];
    spawnMock.mockImplementation((cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return makeFakeChild({ exitCode: 0 });
    });
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('xdotool');
    await dispatcher.press({ key: 'space' });
    const dispatchCall = calls.find((c) => c.cmd === 'xdotool' && c.args.includes('space'));
    expect(dispatchCall).toBeDefined();
  });

  it('xdotool dispatch uses shift+Tab arg', async () => {
    const calls: Array<{ cmd: string; args: string[] }> = [];
    spawnMock.mockImplementation((cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return makeFakeChild({ exitCode: 0 });
    });
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('xdotool');
    await dispatcher.press({ key: 'tab', shift: true });
    const dispatchCall = calls.find((c) => c.cmd === 'xdotool' && c.args.includes('shift+Tab'));
    expect(dispatchCall).toBeDefined();
  });

  it('wtype dispatch uses -M shift -k Tab -m shift for shift+tab', async () => {
    const calls: Array<{ cmd: string; args: string[] }> = [];
    spawnMock.mockImplementation((cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return makeFakeChild({ exitCode: 0 });
    });
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('wtype');
    await dispatcher.press({ key: 'tab', shift: true });
    const dispatchCall = calls.find(
      (c) =>
        c.cmd === 'wtype' &&
        c.args.includes('-M') &&
        c.args.includes('shift') &&
        c.args.includes('-k') &&
        c.args.includes('Tab'),
    );
    expect(dispatchCall).toBeDefined();
  });

  it('powershell dispatch sends + {TAB} for shift+tab', async () => {
    platformMock.mockReturnValue('win32');
    const calls: Array<{ cmd: string; args: string[] }> = [];
    spawnMock.mockImplementation((cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return makeFakeChild({ exitCode: 0 });
    });
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('powershell');
    await dispatcher.press({ key: 'tab', shift: true });
    const dispatchCall = calls.find(
      (c) => c.cmd === 'powershell' && c.args.some((a) => a.includes('+{TAB}')),
    );
    expect(dispatchCall).toBeDefined();
  });

  it('press swallows dispatcher errors (logs only) so the caller never throws', async () => {
    let firstCall = true;
    spawnMock.mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return makeFakeChild({ exitCode: 0 }); // probe ok
      }
      return makeFakeChild({ exitCode: 1, stderr: 'boom' });
    });
    const { createKeyDispatcher } = await import('../../server/keys');
    const dispatcher = await createKeyDispatcher('xdotool');
    await expect(dispatcher.press({ key: 'space' })).resolves.toBeUndefined();
  });
});
