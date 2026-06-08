import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // For JWT cookie
});

let reauthPromise: Promise<void> | null = null;

const shouldSkipReauth = (path: string) => {
  return path.includes('/auth/identify') || path.includes('/auth/login') || path.includes('/auth/gov-login');
};

const tryReauthenticate = async () => {
  if (reauthPromise) {
    return reauthPromise;
  }

  reauthPromise = (async () => {
    const tg = (window as any).Telegram?.WebApp;
    const initData = tg?.initData;
    if (!initData) {
      throw new Error('missing telegram initData');
    }

    const identifyPayload: { init_data: string; bot_id?: number } = { init_data: initData };
    const botId = getBotId();
    const startParam = tg?.initDataUnsafe?.start_param;
    const botIdHint = botId || (/^\d+$/.test(startParam || '') ? startParam : null);
    if (botIdHint) {
      identifyPayload.bot_id = Number(botIdHint);
    }

    await axios.post('/api/v1/auth/identify', identifyPayload, { withCredentials: true });
  })();

  try {
    await reauthPromise;
  } finally {
    reauthPromise = null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as any;
    const requestPath = originalRequest?.url || '';

    if (status !== 401 || !originalRequest || originalRequest._retry || shouldSkipReauth(requestPath)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await tryReauthenticate();
      return api(originalRequest);
    } catch (reauthError) {
      return Promise.reject(reauthError);
    }
  }
);

export const getBotId = () => {
  const pathname = window.location.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const botId = segments[0];
  
  // Apenas retorna se for puramente numérico
  if (botId && /^\d+$/.test(botId)) {
    return botId;
  }
  
  return null;
};

export const fetchMe = async (botId: string) => {
  const { data } = await api.get(`/bots/${botId}/dashboard/me`);
  return data;
};

export const fetchShopItems = async (botId: string) => {
  const { data } = await api.get(`/bots/${botId}/dashboard/store`);
  return data;
};

export const fetchBalanceRanking = async (botId: string) => {
  const { data } = await api.get(`/bots/${botId}/dashboard/ranking/balance`);
  return data;
};

export const fetchMessagesRanking = async (botId: string) => {
  const { data } = await api.get(`/bots/${botId}/dashboard/ranking/messages`);
  return data;
};

export const fetchBotConfig = async (botId: string) => {
  const { data } = await api.get(`/bots/${botId}/dashboard/config`);
  return data;
};

export const fetchMyLogs = async (botId: string, limit: number = 20, offset: number = 0) => {
  const { data } = await api.get(`/bots/${botId}/dashboard/logs?limit=${limit}&offset=${offset}`);
  return data;
};

export const buyItem = async (botId: string, itemId: string) => {
  const { data } = await api.post(`/bots/${botId}/dashboard/store/buy`, {
    item_id: itemId,
  });
  return data;
};

export const consumeItem = async (botId: string, itemId: string, metadata?: string) => {
  const { data } = await api.post(`/bots/${botId}/dashboard/inventory/use`, {
    item_id: itemId,
    metadata: metadata,
  });
  return data;
};

export const sellItemToShop = async (botId: string, itemId: string) => {
  const { data } = await api.post(`/bots/${botId}/dashboard/inventory/sell`, {
    item_id: itemId,
  });
  return data;
};

// --- Admin API ---

export const adminFetchItems = async (botId: string) => {
  const { data } = await api.get(`/admin/bots/${botId}/items`);
  return data;
};

export const adminCreateItem = async (botId: string, itemData: any) => {
  const { data } = await api.post(`/admin/bots/${botId}/items`, itemData);
  return data;
};

export const adminDeleteItem = async (botId: string, itemId: string) => {
  const { data } = await api.delete(`/admin/bots/${botId}/items/${itemId}`);
  return data;
};

export const adminUpdateStock = async (botId: string, itemId: string, stock: number) => {
  const { data } = await api.patch(`/admin/bots/${botId}/items/${itemId}/stock`, { stock });
  return data;
};

export const adminUpdatePrice = async (botId: string, itemId: string, price: number) => {
  const { data } = await api.patch(`/admin/bots/${botId}/items/${itemId}/price`, { price });
  return data;
};

export const adminUpdateResalePrice = async (botId: string, itemId: string, resale_price: number) => {
  const { data } = await api.patch(`/admin/bots/${botId}/items/${itemId}/resale-price`, { resale_price });
  return data;
};

export const adminAddBalance = async (botId: string, userId: string, amount: number, reason: string) => {
  const { data } = await api.post(`/admin/bots/${botId}/users/${userId}/balance/add`, { amount, reason });
  return data;
};

export const adminReduceBalance = async (botId: string, userId: string, amount: number, reason: string) => {
  const { data } = await api.post(`/admin/bots/${botId}/users/${userId}/balance/reduce`, { amount, reason });
  return data;
};

export const fetchAdminBalanceLogs = async (botId: string) => {
  const { data } = await api.get(`/admin/bots/${botId}/logs/balance`);
  return data;
};

export const adminFetchUsers = async (botId: string) => {
  const { data } = await api.get(`/admin/bots/${botId}/users`);
  return data;
};

export const adminAddAdmin = async (botId: string, userId: string) => {
  const { data } = await api.post(`/admin/bots/${botId}/users/${userId}/promote`);
  return data;
};

export const adminRemoveAdmin = async (botId: string, userId: string) => {
  const { data } = await api.delete(`/admin/bots/${botId}/users/${userId}/demote`);
  return data;
};

export const adminFetchAdmins = async (botId: string) => {
  const { data } = await api.get(`/admin/bots/${botId}/admins`);
  return data;
};

export const adminFetchConfig = async (botId: string) => {
  const { data } = await api.get(`/admin/bots/${botId}/config`);
  return data;
};

export const adminUpdateConfig = async (botId: string, config: any) => {
  const { data } = await api.patch(`/admin/bots/${botId}/config`, config);
  return data;
};

export const adminFetchTreasury = async (botId: string) => {
  const { data } = await api.get(`/admin/bots/${botId}/treasury`);
  return data;
};

export const adminPayInstallment = async (botId: string) => {
  const { data } = await api.post(`/admin/bots/${botId}/treasury/pay`);
  return data;
};

export const adminFetchBotMacroParams = async (botId: string) => {
  const { data } = await api.get(`/admin/bots/${botId}/macro-params`);
  return data as Array<{
    scope_type: string;
    scope_ref: string;
    key: string;
    value: string;
    version: number;
  }>;
};

export const adminUpsertBotMacroParam = async (botId: string, item: { key: string; value: string; reason?: string }) => {
  const { data } = await api.put(`/admin/bots/${botId}/macro-params`, item);
  return data as { message: string; value: string; version: number };
};

export const fetchMacroInfo = async (botId: string) => {
  const { data } = await api.get(`/bots/${botId}/dashboard/macro-info`);
  return data as {
    effective_for_group: string;
    resolved_at: string;
    params: Record<string, string>;
  };
};

// --- GOV API ---

const govApi = axios.create({
  baseURL: '/api/v1/gov',
  withCredentials: true,
});

export interface GovMacroParam {
  scope_type: string;
  scope_ref: string;
  key: string;
  value: string;
  version: number;
}

export interface GovMacroParamChange {
  scope_type: string;
  scope_ref: string;
  key: string;
  old_value: string;
  new_value: string;
  version: number;
  changed_at: string;
}

export interface GovGroupHealth {
  bot_id: number;
  bot_group_id: string;
  group_id: number;
  title: string;
  treasury_balance: number;
  treasury_locked: number;
  accumulated_debt: number;
  liquidity_ratio: number;
  leverage_ratio: number;
  user_lock_rate: number;
  pending_payouts: number;
  operational_state: string;
  operational_score: number;
  signals: string[];
}

export interface GovMacroAlert {
  id: string;
  bot_id: number;
  bot_group_id: string;
  severity: string;
  signal: string;
  message: string;
  status: string;
  created_at: string;
}

export interface GovReconciliation {
  id: string;
  bot_id: number;
  group_count: number;
  delta_group_available: number;
  delta_group_locked: number;
  delta_user_available: number;
  delta_abs_total: number;
  status: string;
  created_at: string;
}

export const fetchGovMacroParams = async (filters?: { scope_type?: string; scope_ref?: string; key?: string }) => {
  const params = new URLSearchParams();
  if (filters?.scope_type) params.set('scope_type', filters.scope_type);
  if (filters?.scope_ref) params.set('scope_ref', filters.scope_ref);
  if (filters?.key) params.set('key', filters.key);
  const qs = params.toString();
  const { data } = await govApi.get(`/macro-params${qs ? `?${qs}` : ''}`);
  return data as GovMacroParam[];
};

export const updateGovMacroParams = async (items: Array<{
  scope_type: string;
  scope_ref: string;
  key: string;
  value: string;
  reason?: string;
}>) => {
  const { data } = await govApi.put('/macro-params', { params: items });
  return data;
};

export const fetchGovMacroParamChanges = async (key?: string) => {
  const qs = key ? `?key=${encodeURIComponent(key)}` : '';
  const { data } = await govApi.get(`/macro-params/changes${qs}`);
  return data as GovMacroParamChange[];
};

export const fetchGovGroupHealth = async () => {
  const { data } = await govApi.get('/group-health');
  return data as GovGroupHealth[];
};

export const fetchGovAlerts = async (status: string = 'open') => {
  const { data } = await govApi.get(`/alerts?status=${status}`);
  return data as GovMacroAlert[];
};

export const acknowledgeGovAlert = async (alertId: string) => {
  const { data } = await govApi.post('/alerts/ack', { alert_id: alertId });
  return data;
};

export const fetchGovReconciliations = async () => {
  const { data } = await govApi.get('/reconciliations');
  return data as GovReconciliation[];
};
