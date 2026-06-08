import axios, { type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, fetchMe } from './api';

const okResponse = (config: any, data: any = { ok: true }): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const unauthorizedError = (config: any) => {
  const err: any = new Error('Unauthorized');
  err.config = config;
  err.response = { status: 401, data: {}, headers: {}, config };
  return err;
};

describe('api 401 reauthentication', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { pathname: '/900001/dashboard' },
      Telegram: { WebApp: { initData: 'signed-init-data', initDataUnsafe: {} } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    api.defaults.adapter = undefined;
  });

  it('reauthenticates with bot_id hint and retries original request once', async () => {
    const identify = vi.spyOn(axios, 'post').mockResolvedValue(okResponse({}, { bot_id: 900001 }));
    let attempts = 0;
    api.defaults.adapter = async (config) => {
      attempts += 1;
      if (attempts === 1) {
        throw unauthorizedError(config);
      }
      return okResponse(config, { user: 'ok' });
    };

    const data = await fetchMe('900001');

    expect(data).toEqual({ user: 'ok' });
    expect(attempts).toBe(2);
    expect(identify).toHaveBeenCalledWith(
      '/api/v1/auth/identify',
      { init_data: 'signed-init-data', bot_id: 900001 },
      { withCredentials: true }
    );
  });

  it('does not reauthenticate auth endpoints to avoid retry loops', async () => {
    const identify = vi.spyOn(axios, 'post').mockResolvedValue(okResponse({}));
    api.defaults.adapter = async (config) => {
      throw unauthorizedError(config);
    };

    await expect(api.post('/auth/login', {})).rejects.toThrow('Unauthorized');

    expect(identify).not.toHaveBeenCalled();
  });
});
