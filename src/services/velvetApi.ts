/**
 * Velvet 自研后端客户端（Spring Boot）。
 *
 * 取代 PocketBase SDK 的最小子集：
 *  - JWT 登录态：localStorage 持久化，刷新后自动恢复（与 pb.authStore 行为对齐）
 *  - fetch 封装：自动带 Authorization，401 统一抛 VelvetApiError
 *  - 错误形状：兼容 auth.ts 里 isVelvetNotFound/hasErrorCode 的探测逻辑
 *
 * 契约（对齐后端 AuthController）：
 *   POST /api/velvet/register           {email, password, name?} → 200 {token, record}
 *   POST /api/velvet/auth-with-password {identity(email|name), password} → 200 {token, record}
 *   GET  /api/me                        (Authorization) → 200 record
 *   PUT  /api/velvet/profile            (Authorization) {…patch} → 200 record
 *   401 {velvet:"not_found"}；409 {velvet:"not_found", message:"email already registered"}
 */

const API_URL = normalizeEndpoint(import.meta.env.VITE_API_URL as string | undefined);

/** 后端根地址（AI 代理改道用；未配置 = 空串） */
export const getApiBaseUrl = (): string => API_URL;

function normalizeEndpoint(url: string | undefined): string {
  return (url ?? '').trim().replace(/\/+$/, '');
}

/** 云同步开关：配了自研后端地址即启用 */
export const cloudEnabled = Boolean(API_URL);

/** 后端基址（供 userDataApi 等扩展模块复用）。未配置时为空串 */
export const apiBaseUrl = API_URL;

const TOKEN_KEY = 'velvet.jwt';
const RECORD_KEY = 'velvet.record';

export interface VelvetRecord {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  created?: string;
  updated?: string;
  total_lv?: number;
  username?: string | null;
}

export class VelvetApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `velvet api error ${status}`);
    this.status = status;
    this.body = body;
  }
}

// ── 登录态（localStorage 持久化，行为对齐 pb.authStore） ─────

let currentToken: string | null = null;
let currentRecord: VelvetRecord | null = null;
let authGeneration = 0;

/** 登出、换号或重新登录使在途操作失效；资料更新不改变会话代次。 */
export const getAuthGeneration = (): number => authGeneration;

/** 模块加载时恢复登录态（对齐 pb.authStore 刷新恢复行为） */
try {
  currentToken = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(RECORD_KEY);
  if (raw) currentRecord = JSON.parse(raw) as VelvetRecord;
  if (!currentToken) currentRecord = null;
} catch { /* 无痕模式：忽略 */ }

type AuthListener = (record: VelvetRecord | null) => void;
const listeners = new Set<AuthListener>();

export const isAuthenticated = (): boolean => Boolean(currentToken && currentRecord);

export const getAuthRecord = (): VelvetRecord | null => currentRecord;

export const getUserId = (): string | null => currentRecord?.id ?? null;

export const getToken = (): string | null => currentToken;

export const onAuthChange = (cb: AuthListener): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const saveAuth = (token: string, record: VelvetRecord): void => {
  if (currentToken !== token || currentRecord?.id !== record.id) authGeneration++;
  currentToken = token;
  currentRecord = record;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch { /* 无痕模式 */ }
  listeners.forEach((l) => l(record));
};

export const clearAuth = (): void => {
  authGeneration++;
  currentToken = null;
  currentRecord = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(RECORD_KEY);
  } catch { /* 无痕模式 */ }
  listeners.forEach((l) => l(null));
};

// 其他标签页登出或换号后，这个标签页的在途同步也必须失效。
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.storageArea !== localStorage || (event.key !== null && event.key !== TOKEN_KEY && event.key !== RECORD_KEY)) return;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(RECORD_KEY);
    const record = token && raw ? JSON.parse(raw) as VelvetRecord : null;
    if (token !== currentToken || record?.id !== currentRecord?.id) authGeneration++;
    currentToken = token;
    currentRecord = record;
    listeners.forEach(listener => listener(record));
  } catch {
    authGeneration++;
    currentToken = null;
    currentRecord = null;
    listeners.forEach(listener => listener(null));
  }
});

// ── 邮箱验证码 OTP（登录/注册合一） ─────────────────────────

/** 发送验证码。429 → 冷却（body.message 含秒数） */
export const requestOtp = (email: string): Promise<void> =>
  request<void>('/api/velvet/otp/request', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email }),
  });

/** 校验验证码 → {token, record}（新邮箱自动注册）。401 → 验证码错/过期 */
export const verifyOtp = async (email: string, code: string): Promise<VelvetRecord> => {
  const r = await request<{ token: string; record: VelvetRecord }>('/api/velvet/otp/verify', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, code }),
  });
  saveAuth(r.token, r.record);
  return r.record;
};

// ── 忘记密码（邮件一次性链接） ───────────────────────────────

/**
 * 申请重置邮件。身份可以是邮箱或 UserID。
 * 服务端对不存在的账号同样回成功（不泄露账号是否存在）；429 = 发送过频。
 */
export const requestPasswordReset = (identity: string): Promise<void> =>
  request<void>('/api/velvet/request-password-reset', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ identity }),
  });

/** 用邮件里的一次性令牌设置新密码。401 = 令牌无效或已过期（不区分哪一种） */
export const resetPassword = (token: string, password: string): Promise<void> =>
  request<void>('/api/velvet/reset-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ token, password }),
  });

/** 注销账号：删除本人及名下云端数据。本机数据不动 */
export const deleteAccount = (): Promise<void> =>
  request<void>('/api/velvet/account', { method: 'DELETE' });

/**
 * 服务端**实际**配了钥匙的服务商清单（只回名字，不回 Key）。
 * 前端据此决定某个服务商的请求该走后端代理还是直连 —— 服务器没配的那几家，
 * 直连（用用户自己的 Key）才是能成功的路。
 */
export interface AiCapabilities {
  providers: string[];
}

export const fetchAiCapabilities = (): Promise<AiCapabilities> =>
  request<AiCapabilities>('/api/ai/capabilities', { method: 'GET' });

// ── fetch 封装 ──────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  if (!API_URL) throw new Error('云同步未配置');
  const headers: Record<string, string> = {};
  // FormData 必须让浏览器自己设 Content-Type（要带 multipart 的 boundary）；
  // 手动写死 application/json 会让后端无法解析上传内容。
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  Object.assign(headers, (init.headers as Record<string, string>) ?? {});
  if (init.auth !== false && currentToken) headers.Authorization = `Bearer ${currentToken}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); }
    catch {
      if (res.ok) throw new VelvetApiError(res.status, null, '服务器响应格式错误');
      // 代理可能返回 HTML 错误页；保留 HTTP 状态，但不传播原始页面内容。
    }
  }
  if (!res.ok) throw new VelvetApiError(res.status, body);
  return body as T;
}

/** 供扩展模块（userDataApi / sync）复用的 fetch 封装：自动带 JWT、统一错误形状 */
export { request as velvetRequest };

/** 当前登录 token（供扩展模块判断会话态） */
export const getAuthToken = (): string | null => currentToken;

// ── 认证 API（契约对齐 auth.ts 现有调用形状） ───────────────

/** 注册：成功即登录。409 → 邮箱/Name 已被占用 */
export const register = async (email: string, password: string, name?: string): Promise<VelvetRecord> => {
  const r = await request<{ token: string; record: VelvetRecord }>('/api/velvet/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password, name }),
  });
  saveAuth(r.token, r.record);
  return r.record;
};

/** 密码登录：identity 接受 email 或 name。401 → velvet:not_found */
export const authWithPassword = async (identity: string, password: string): Promise<VelvetRecord> => {
  const r = await request<{ token: string; record: VelvetRecord }>('/api/velvet/auth-with-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ identity, password }),
  });
  saveAuth(r.token, r.record);
  return r.record;
};

export const changePassword = async (oldPassword: string, password: string, passwordConfirm: string): Promise<VelvetRecord> => {
  const generation = getAuthGeneration();
  const result = await request<{ token: string; record: VelvetRecord }>('/api/velvet/change-password', {
    method: 'POST', body: JSON.stringify({ oldPassword, password, passwordConfirm }),
  });
  if (generation !== getAuthGeneration()) throw new Error('登录状态已变化，请重新登录');
  saveAuth(result.token, result.record);
  return result.record;
};

/** 当前用户（含 token 过期后的 401） */
export const fetchMe = (): Promise<VelvetRecord> => request<VelvetRecord>('/api/me', { method: 'GET' });

/** 更新 profile 字段 */
export const updateProfile = async (patch: Record<string, unknown>): Promise<VelvetRecord> => {
  const r = await request<VelvetRecord>('/api/velvet/profile', { method: 'PUT', body: JSON.stringify(patch) });
  if (currentRecord && currentToken) saveAuth(currentToken, { ...currentRecord, ...r });
  return r;
};
