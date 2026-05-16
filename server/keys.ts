import { spawn } from 'node:child_process';
import os from 'node:os';

import { log } from './log';

export type KeystrokeBackend =
  | 'auto'
  | 'osascript'
  | 'xdotool'
  | 'wtype'
  | 'ydotool'
  | 'powershell'
  | 'off';

export type ResolvedBackend = Exclude<KeystrokeBackend, 'auto'>;

export type KeyDispatcher = {
  readonly backend: ResolvedBackend;
  press: (key: KeyCombo) => Promise<void>;
  dispose: () => void;
};

export type KeyCombo =
  | { key: 'space' }
  | { key: 'tab'; shift?: boolean };

type ProbeResult = { ok: boolean; stderr?: string };

const PROBE_TIMEOUT_MS = 500;
const DISPATCH_TIMEOUT_MS = 200;

type RunOptions = { timeoutMs?: number; input?: string };

const runCommand = (
  cmd: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): Promise<{ code: number | null; stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args as string[], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new Error(`timed out after ${options.timeoutMs ?? DISPATCH_TIMEOUT_MS}ms`));
    }, options.timeoutMs ?? DISPATCH_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.once('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.once('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    if (options.input !== undefined) {
      child.stdin?.end(options.input);
    } else {
      child.stdin?.end();
    }
  });
};

const probe = async (
  cmd: string,
  args: ReadonlyArray<string>,
): Promise<ProbeResult> => {
  try {
    const { code, stderr } = await runCommand(cmd, args, { timeoutMs: PROBE_TIMEOUT_MS });
    return { ok: code === 0, stderr };
  } catch (err) {
    return { ok: false, stderr: err instanceof Error ? err.message : String(err) };
  }
};

const probeBackend = async (backend: ResolvedBackend): Promise<boolean> => {
  if (backend === 'off') return true;
  if (backend === 'osascript') return (await probe('osascript', ['-e', 'return 1'])).ok;
  if (backend === 'xdotool') return (await probe('xdotool', ['--version'])).ok;
  if (backend === 'wtype') return (await probe('wtype', ['-h'])).ok;
  if (backend === 'ydotool') return (await probe('ydotool', ['--help'])).ok;
  if (backend === 'powershell') return (await probe('powershell', ['-NoProfile', '-Command', 'exit 0'])).ok;
  return false;
};

const platformPreference = (): ReadonlyArray<ResolvedBackend> => {
  const platform = os.platform();
  if (platform === 'darwin') return ['osascript'];
  if (platform === 'win32') return ['powershell'];
  if (platform === 'linux') {
    const wayland = !!process.env.WAYLAND_DISPLAY;
    return wayland ? ['wtype', 'ydotool', 'xdotool'] : ['xdotool', 'wtype', 'ydotool'];
  }
  return [];
};

export const resolveBackend = async (preference: KeystrokeBackend): Promise<ResolvedBackend> => {
  if (preference === 'off') return 'off';
  if (preference !== 'auto') {
    const ok = await probeBackend(preference);
    if (!ok) {
      log.warn('host keystroke backend probe failed', { backend: preference });
      return 'off';
    }
    return preference;
  }
  for (const candidate of platformPreference()) {
    if (await probeBackend(candidate)) return candidate;
  }
  log.warn('no host keystroke backend available', { platform: os.platform() });
  return 'off';
};

const osascriptCommand = (combo: KeyCombo): string => {
  if (combo.key === 'space') {
    return 'tell application "System Events" to keystroke " "';
  }
  // Shift+Tab: key code 48 with shift modifier
  return 'tell application "System Events" to key code 48 using {shift down}';
};

const dispatchOsascript = async (combo: KeyCombo): Promise<void> => {
  const { code, stderr } = await runCommand('osascript', ['-e', osascriptCommand(combo)]);
  if (code !== 0) throw new Error(`osascript exited ${code}: ${stderr.trim()}`);
};

const dispatchXdotool = async (combo: KeyCombo): Promise<void> => {
  const arg = combo.key === 'space' ? 'space' : combo.shift ? 'shift+Tab' : 'Tab';
  const { code, stderr } = await runCommand('xdotool', ['key', '--clearmodifiers', arg]);
  if (code !== 0) throw new Error(`xdotool exited ${code}: ${stderr.trim()}`);
};

const dispatchWtype = async (combo: KeyCombo): Promise<void> => {
  const args: string[] = [];
  if (combo.key === 'space') {
    args.push('-k', 'space');
  } else if (combo.shift) {
    args.push('-M', 'shift', '-k', 'Tab', '-m', 'shift');
  } else {
    args.push('-k', 'Tab');
  }
  const { code, stderr } = await runCommand('wtype', args);
  if (code !== 0) throw new Error(`wtype exited ${code}: ${stderr.trim()}`);
};

const dispatchYdotool = async (combo: KeyCombo): Promise<void> => {
  // ydotool key codes are Linux input event codes:
  // 57 = KEY_SPACE, 15 = KEY_TAB, 42 = KEY_LEFTSHIFT.
  const args: string[] = ['key'];
  if (combo.key === 'space') {
    args.push('57:1', '57:0');
  } else if (combo.shift) {
    args.push('42:1', '15:1', '15:0', '42:0');
  } else {
    args.push('15:1', '15:0');
  }
  const { code, stderr } = await runCommand('ydotool', args);
  if (code !== 0) throw new Error(`ydotool exited ${code}: ${stderr.trim()}`);
};

const dispatchPowershell = async (combo: KeyCombo): Promise<void> => {
  const sendKeys = combo.key === 'space' ? ' ' : combo.shift ? '+{TAB}' : '{TAB}';
  const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeys.replace(/'/g, "''")}')`;
  const { code, stderr } = await runCommand(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-Command', script],
  );
  if (code !== 0) throw new Error(`powershell exited ${code}: ${stderr.trim()}`);
};

const dispatchers: Record<ResolvedBackend, (combo: KeyCombo) => Promise<void>> = {
  off: async () => {
    /* no-op */
  },
  osascript: dispatchOsascript,
  xdotool: dispatchXdotool,
  wtype: dispatchWtype,
  ydotool: dispatchYdotool,
  powershell: dispatchPowershell,
};

export const createKeyDispatcher = async (
  preference: KeystrokeBackend,
): Promise<KeyDispatcher> => {
  const backend = await resolveBackend(preference);
  log.info('host keystroke backend resolved', {
    preference,
    backend,
    platform: os.platform(),
  });

  const press = async (key: KeyCombo): Promise<void> => {
    if (backend === 'off') {
      log.warn('host keystroke skipped (backend=off)', { key: key.key });
      return;
    }
    try {
      await dispatchers[backend](key);
      log.info('host keystroke dispatched', { backend, key: key.key });
    } catch (err) {
      log.error('host keystroke failed', {
        backend,
        key: key.key,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return {
    backend,
    press,
    dispose: () => {
      /* nothing to clean up */
    },
  };
};
