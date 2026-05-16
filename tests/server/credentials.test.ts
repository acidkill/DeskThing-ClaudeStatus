import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CredentialsError, expandHome, readCredentials } from '../../server/credentials';

let tmpDir = '';

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clawd-creds-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const write = async (name: string, body: string): Promise<string> => {
  const p = path.join(tmpDir, name);
  await fs.writeFile(p, body, 'utf8');
  return p;
};

describe('expandHome', () => {
  it('expands a leading tilde', () => {
    expect(expandHome('~/foo/bar')).toBe(path.join(os.homedir(), '/foo/bar'));
  });

  it('passes absolute paths through untouched', () => {
    expect(expandHome('/etc/passwd')).toBe('/etc/passwd');
  });

  it('does not expand mid-string tildes', () => {
    expect(expandHome('/tmp/~weird')).toBe('/tmp/~weird');
  });
});

describe('readCredentials', () => {
  it('reads the modern claudeAiOauth shape', async () => {
    const p = await write(
      '.credentials.json',
      JSON.stringify({
        claudeAiOauth: {
          accessToken: 'tok-abc',
          refreshToken: 'ref-xyz',
          expiresAt: Date.now() + 60_000,
        },
      }),
    );
    const creds = await readCredentials(p);
    expect(creds.accessToken).toBe('tok-abc');
    expect(creds.refreshToken).toBe('ref-xyz');
    expect(creds.resolvedPath).toBe(p);
  });

  it('falls back to the legacy snake_case shape', async () => {
    const p = await write(
      '.credentials.json',
      JSON.stringify({ access_token: 'legacy', refresh_token: 'legacy-ref' }),
    );
    const creds = await readCredentials(p);
    expect(creds.accessToken).toBe('legacy');
    expect(creds.refreshToken).toBe('legacy-ref');
    expect(creds.expiresAt).toBeNull();
  });

  it('throws NOT_FOUND for a missing file', async () => {
    await expect(readCredentials(path.join(tmpDir, 'nope.json'))).rejects.toMatchObject({
      name: 'CredentialsError',
      code: 'NOT_FOUND',
    });
  });

  it('throws INVALID_JSON for malformed content', async () => {
    const p = await write('bad.json', '{ not json');
    await expect(readCredentials(p)).rejects.toMatchObject({ code: 'INVALID_JSON' });
  });

  it('throws NO_TOKEN when neither token shape is present', async () => {
    const p = await write('empty.json', JSON.stringify({ other: true }));
    await expect(readCredentials(p)).rejects.toMatchObject({ code: 'NO_TOKEN' });
  });

  it('throws EXPIRED when expiresAt is in the past', async () => {
    const p = await write(
      'expired.json',
      JSON.stringify({
        claudeAiOauth: {
          accessToken: 'old',
          expiresAt: Date.now() - 60_000,
        },
      }),
    );
    await expect(readCredentials(p)).rejects.toMatchObject({ code: 'EXPIRED' });
  });

  it('CredentialsError carries the supplied code and message', () => {
    const err = new CredentialsError('NOT_FOUND', 'boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('boom');
  });
});
