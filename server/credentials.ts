import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export class CredentialsError extends Error {
  readonly code:
    | 'NOT_FOUND'
    | 'UNREADABLE'
    | 'INVALID_JSON'
    | 'NO_TOKEN'
    | 'EXPIRED';

  constructor(code: CredentialsError['code'], message: string) {
    super(message);
    this.name = 'CredentialsError';
    this.code = code;
  }
}

export type Credentials = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  resolvedPath: string;
};

export const expandHome = (input: string): string => {
  if (input.startsWith('~')) {
    return path.join(os.homedir(), input.slice(1));
  }
  return input;
};

type RawCredentials = {
  claudeAiOauth?: {
    accessToken?: unknown;
    refreshToken?: unknown;
    expiresAt?: unknown;
  };
  access_token?: unknown;
  refresh_token?: unknown;
  expires_at?: unknown;
};

const pickString = (raw: unknown): string | null => {
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
};

const pickNumber = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const readCredentials = async (rawPath: string): Promise<Credentials> => {
  const resolvedPath = path.resolve(expandHome(rawPath));

  let contents: string;
  try {
    contents = await fs.readFile(resolvedPath, 'utf8');
  } catch (err) {
    const node = err as NodeJS.ErrnoException;
    if (node.code === 'ENOENT') {
      throw new CredentialsError('NOT_FOUND', `Credentials file missing at ${resolvedPath}`);
    }
    throw new CredentialsError('UNREADABLE', `Could not read credentials at ${resolvedPath}: ${node.code ?? 'unknown'}`);
  }

  let parsed: RawCredentials;
  try {
    parsed = JSON.parse(contents) as RawCredentials;
  } catch {
    throw new CredentialsError('INVALID_JSON', `Credentials file at ${resolvedPath} is not valid JSON`);
  }

  const accessToken =
    pickString(parsed.claudeAiOauth?.accessToken) ?? pickString(parsed.access_token);
  if (!accessToken) {
    throw new CredentialsError('NO_TOKEN', `No accessToken field found in credentials at ${resolvedPath}`);
  }

  const refreshToken =
    pickString(parsed.claudeAiOauth?.refreshToken) ?? pickString(parsed.refresh_token);
  const expiresAt =
    pickNumber(parsed.claudeAiOauth?.expiresAt) ?? pickNumber(parsed.expires_at);

  if (expiresAt !== null && expiresAt < Date.now()) {
    throw new CredentialsError(
      'EXPIRED',
      `Credentials at ${resolvedPath} expired at ${new Date(expiresAt).toISOString()}; run "claude login" to refresh`,
    );
  }

  return { accessToken, refreshToken, expiresAt, resolvedPath };
};
