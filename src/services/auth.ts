/**
 * 账号服务：注册 / 登录（密码与邮箱验证码）/ 忘记密码 / 改密 / 换 UserID / 注销。
 *
 * 全部走自研后端（velvetApi）。PocketBase 时期的旧路径已随退役删除——
 * 那些函数在自研部署里既没有调用方，也无法工作（pb 恒为 null）。
 */
import { clearPactRunner } from './pactBackground';
import * as velvetApi from './velvetApi';
import { VelvetApiError, cloudEnabled, type VelvetRecord } from './velvetApi';

/** 简单的邮箱格式校验 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/** UserID 格式校验：3-18 位小写字母 / 数字 / 首尾字母数字，中间允许 ._- */
export const isValidUserId = (userId: string): boolean => {
  const v = userId.trim();
  if (v.length < 3 || v.length > 18) return false;
  return /^[a-z0-9]([a-z0-9._-]{1,16})[a-z0-9]$/.test(v);
};

/** 判断输入是邮箱还是 UserID */
export const looksLikeEmail = (identity: string): boolean => identity.includes('@');

// ── 注册 / 登录 · 邮箱验证码 ────────────────────────────────

/**
 * 一步式「登录或登记」：邮箱验证码。
 *
 * 新用户与老用户由服务端按邮箱自动判定，客户端只负责格式校验与发码，
 * 所以这里没有「先建号再发码」那条老路（PB 时代靠 400 错误码判断邮箱是否已存在的做法一并删了）。
 */
export const requestLoginOrSignupOTP = async (
  identity: string,
): Promise<{ otpId: string; wasSignup: boolean }> => {
  if (!cloudEnabled) throw new Error('云同步未配置');
  const normalized = identity.trim().toLowerCase();
  if (!normalized) throw new Error('请输入 UserID 或邮箱');

  if (looksLikeEmail(normalized)) {
    if (!isValidEmail(normalized)) throw new Error('邮箱格式不正确');
    await velvetApi.requestOtp(normalized);
    return { otpId: normalized, wasSignup: false }; // 新旧用户服务端自动判定
  }

  // UserID 输入：自研后端按邮箱发码——提示用户改用邮箱
  throw new Error('验证码登录请使用注册邮箱；UserID 请改用密码登录');
};

/** 提交验证码完成登录（自研后端：otpId 即邮箱） */
export const verifyOTP = async (otpId: string, code: string): Promise<VelvetRecord> => {
  if (!cloudEnabled) throw new Error('云同步未配置');
  const trimmed = code.trim();
  if (!trimmed) throw new Error('请输入验证码');
  try {
    return await velvetApi.verifyOtp(otpId, trimmed);
  } catch (err) {
    if (err instanceof VelvetApiError && err.status === 401) {
      throw new Error('验证码不正确或已过期');
    }
    if (err instanceof VelvetApiError && err.status === 429) {
      throw new Error('尝试太频繁，请稍后再试');
    }
    throw err;
  }
};

// ── 注册 · 密码 ─────────────────────────────────────────────

export interface SignupWithPasswordInput {
  email: string;
  userId: string;
  password: string;
  passwordConfirm: string;
}

/** 用「密码」方式注册：服务端建账号并直接返回登录态 */
export const signUpWithPassword = async (input: SignupWithPasswordInput): Promise<VelvetRecord> => {
  if (!cloudEnabled) throw new Error('云同步未配置');
  const email = input.email.trim().toLowerCase();
  const username = input.userId.trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error('邮箱格式不正确');
  if (!isValidUserId(username)) throw new Error('UserID 应为 3-18 位小写字母 / 数字 / ._-');
  if (input.password.length < 8) throw new Error('密码至少 8 位');
  if (input.password !== input.passwordConfirm) throw new Error('两次密码不一致');

  try {
    return await velvetApi.register(email, input.password, username);
  } catch (err) {
    if (err instanceof VelvetApiError) {
      if (err.status === 409) throw new Error('邮箱或 UserID 已被占用');
      if (err.status === 400) throw new Error('邮箱格式不正确');
      if (err.status >= 500) throw new Error('服务器暂时出错，请稍后再试');
    }
    throw err;
  }
};

// ── 登录 · 密码（identity 可为 UserID 或 Email） ─────────────

/**
 * 密码登录。identity 交给服务端按邮箱 / UserID 匹配。
 *
 * 常见错误的友好提示：用邮箱验证码注册的老账号密码是系统随机生成的——
 * 他们应该走「验证码」Tab，或先用「忘记密码」重置。
 */
const BAD_CREDENTIALS_HINT =
  '账号或密码不正确。\n' +
  '若你之前仅用过邮箱验证码登录，密码是系统随机生成的——请切到「验证码」Tab，或用"忘记密码"先重置。';

export const loginWithPassword = async (
  identity: string,
  password: string,
): Promise<VelvetRecord> => {
  if (!cloudEnabled) throw new Error('云同步未配置');
  if (!identity.trim()) throw new Error('请输入 UserID 或邮箱');
  if (!password) throw new Error('请输入密码');
  try {
    return await velvetApi.authWithPassword(identity.trim().toLowerCase(), password);
  } catch (err) {
    if (err instanceof VelvetApiError) {
      if (err.status === 401) throw new Error(BAD_CREDENTIALS_HINT);
      if (err.status === 429) throw new Error('尝试太频繁，请稍后再试');
      if (err.status >= 500) throw new Error('服务器暂时出错，请稍后再试');
    }
    throw err;
  }
};

// ── 忘记密码 ────────────────────────────────────────────────

/**
 * 申请重置邮件（身份可为邮箱或 UserID）。忘记密码时用户必然未登录，
 * 所以这里按「是否配置了自研后端」判断，不看登录态。
 */
export const requestPasswordReset = async (identity: string): Promise<void> => {
  if (!cloudEnabled) throw new Error('云同步未配置');
  const normalized = identity.trim().toLowerCase();
  if (!normalized) throw new Error('请输入 UserID 或邮箱');
  try {
    await velvetApi.requestPasswordReset(normalized);
  } catch (err) {
    if (err instanceof VelvetApiError) {
      if (err.status === 429) throw new Error('操作太频繁，请稍后再试');
      if (err.status >= 500) throw new Error('服务器暂时出错，请稍后再试');
    }
    throw err;
  }
};

// ── 登出 / 注销 / 账号设置 ──────────────────────────────────

/** 登出（清除本地 token，不调用远程） */
export const logout = (): void => {
  velvetApi.clearAuth();
  void clearPactRunner();
};

/**
 * 永久删除账号（App Store 审核指南 5.1.1(v)：应用内能注册就必须能注销）。
 * 服务端在**一个事务**里删掉本人与名下所有数据；本机数据不动
 * （本地优先应用，注销云端 ≠ 清空本地）。
 */
export const deleteAccount = async (): Promise<void> => {
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');
  await velvetApi.deleteAccount();
  velvetApi.clearAuth();
  void clearPactRunner();
};

/**
 * 首次设置 / 修改 UserID（自研后端 = users.name）。
 * 格式与占用都在服务端再校验一次；撞重复抛「UserID 已被占用」。
 */
export const setOrChangeUserId = async (newUserId: string): Promise<VelvetRecord> => {
  const normalized = newUserId.trim().toLowerCase();
  if (!isValidUserId(normalized)) throw new Error('UserID 应为 3-18 位小写字母 / 数字 / ._-');
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');
  try {
    return await velvetApi.updateProfile({ username: normalized });
  } catch (err) {
    if (err instanceof VelvetApiError && err.status === 409) throw new Error('这个 UserID 已被占用');
    throw err;
  }
};

/**
 * 修改密码（需要旧密码）。用于「我知道当前密码，直接改」场景；
 * 旧密码未知（例如验证码注册的老账号）请走 `requestPasswordReset`。
 */
export const changePasswordWithOld = async (
  oldPassword: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<VelvetRecord> => {
  if (newPassword.length < 8) throw new Error('新密码至少 8 位');
  if (new TextEncoder().encode(newPassword).length > 72) throw new Error('新密码超过 72 字节上限');
  if (newPassword !== newPasswordConfirm) throw new Error('两次新密码不一致');
  if (!velvetApi.isAuthenticated()) throw new Error('未登录');
  try {
    return await velvetApi.changePassword(oldPassword, newPassword, newPasswordConfirm);
  } catch (error) {
    if (error instanceof VelvetApiError && error.status === 400) throw new Error('旧密码不正确或新密码格式不符合要求');
    throw error;
  }
};
