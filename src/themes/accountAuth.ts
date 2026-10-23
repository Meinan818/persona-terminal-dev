/**
 * 三主题共用的账号真实数据层。
 *
 * 背景：主题包里的 AccountManagePanel / LoginModal 原本是"演示壳"——
   · 邮箱 / UserID 来自 mock 常量（CLOUD_USER），不是当前登录用户；
   · 保存 UserID / 改密码 / 发重置邮件走 setTimeout 假动作，一律"成功"；
   · 登录 / 验证码 / 重置密码也是假的（验证码 000000、密码 wrong 用来演示报错）。
 *
 * 这里只提供数据与回调，不碰任何 JSX / 样式：
 *   · 读真实登录态（cloudStore.cloudUser，未登录就是未登录，不填假值）；
 *   · 改 UserID / 改密码 / 发重置邮件走 @/services/auth 的真实后端调用；
 *   · 登录 / 发码 / 验码同样走真实 auth 服务。
 *
 * 失败一律抛真实错误（后端返回什么就显示什么），不伪造成功。
 */
import { useMemo } from 'react';
import { useCloudStore } from '@/store/cloud';
import {
  changePasswordWithOld,
  isValidUserId,
  loginWithPassword,
  requestLoginOrSignupOTP,
  requestPasswordReset,
  setOrChangeUserId,
  verifyOTP,
} from '@/services/auth';

/** 当前登录用户的真实邮箱 / UserID；未登录时为空串（不填占位值）。 */
export function useAccountIdentity() {
  const cloudUser = useCloudStore((s) => s.cloudUser);
  const cloudEnabled = useCloudStore((s) => s.cloudEnabled);
  return useMemo(() => {
    const raw = cloudUser as (Record<string, unknown> & { email?: string; username?: string | null; name?: string | null }) | null;
    return {
      signedIn: !!cloudUser,
      cloudEnabled,
      email: String(raw?.email ?? ''),
      username: String(raw?.username ?? ''),
      nickname: String(raw?.name ?? ''),
    };
  }, [cloudUser, cloudEnabled]);
}

export const accountAuthOps = {
  /** UserID 格式校验（与真实组件同口径：首尾必须是字母数字）。 */
  isValidUserId,

  /** 设置 / 修改 UserID。成功返回服务端确认的 UserID。 */
  async setUserId(userId: string): Promise<string> {
    const record = await setOrChangeUserId(userId);
    return String((record as { username?: string | null }).username ?? userId);
  },

  /** 改密码（需要旧密码）。 */
  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    await changePasswordWithOld(oldPassword, newPassword, newPasswordConfirm);
  },

  /** 发重置密码邮件。 */
  async sendPasswordReset(identity: string): Promise<void> {
    await requestPasswordReset(identity);
  },

  /** 登录或登记 · 发验证码。返回 otpId（邮箱）与是否新登记。 */
  async sendLoginCode(identity: string): Promise<{ otpId: string; wasSignup: boolean }> {
    return requestLoginOrSignupOTP(identity);
  },

  /** 校验验证码并登录。 */
  async verifyLoginCode(otpId: string, code: string): Promise<void> {
    await verifyOTP(otpId, code);
  },

  /** 密码登录。 */
  async loginWithPassword(identity: string, password: string): Promise<void> {
    await loginWithPassword(identity, password);
  },
};

