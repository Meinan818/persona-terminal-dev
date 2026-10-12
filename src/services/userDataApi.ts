/**
 * userDataApi —— 云同步数据面的自研后端客户端。
 *
 * 承接认证迁移（velvetApi），把 src/services/sync.ts 里对 PocketBase 集合的数据面调用
 * 换成自研 Spring Boot 接口 /api/sync/rows。命名与参数形状刻意对齐 PB 的用法，
 * 使 sync.ts 只需替换传输层、业务语义（分片/乐观并发/_meta）一行不动。
 *
 * 后端契约见 backend/.../sync/SyncController.java：
 *   GET    /api/sync/rows[?fields=…] → [{id,key,value?,created,updated},…]
 *   GET    /api/sync/rows/count      → {totalItems}
 *   GET    /api/sync/rows/{id}       → {id,key,value,created,updated}
 *   POST   /api/sync/rows {key,value}→ {id,key,value,created,updated}
 *   PUT    /api/sync/rows/{id} {value} → {id,updated}
 *   DELETE /api/sync/rows/{id}       → 204
 *   PUT    /api/sync/profile {…patch}→ 完整 record
 */
import { velvetRequest, isAuthenticated as velvetIsAuth, getUserId as velvetGetUserId } from './velvetApi';

/** 云端一行。value 是全量模式下该表的行数组；ids 模式下缺省 */
export interface CloudRow {
  id: string;
  key: string;
  value?: unknown;
  created: string;
  updated: string;
}

export const isAuthenticated = (): boolean => velvetIsAuth();
export const getUserId = (): string | null => velvetGetUserId();

/** 列出当前用户全部 user_data 行。ids=true 时走投影模式（不带 value，省流量） */
export const listRows = (opts: { ids?: boolean } = {}): Promise<CloudRow[]> =>
  velvetRequest<CloudRow[]>(`/api/sync/rows${opts.ids ? '?fields=id,key,updated,created' : ''}`);

export const countRows = (): Promise<{ totalItems: number }> =>
  velvetRequest<{ totalItems: number }>('/api/sync/rows/count');

export const getRow = (id: string): Promise<CloudRow> =>
  velvetRequest<CloudRow>(`/api/sync/rows/${encodeURIComponent(id)}`);

export const createRow = (key: string, value: unknown): Promise<CloudRow> =>
  velvetRequest<CloudRow>('/api/sync/rows', { method: 'POST', body: JSON.stringify({ key, value }) });

export const updateRow = (id: string, value: unknown): Promise<{ id: string; updated: string }> =>
  velvetRequest<{ id: string; updated: string }>(`/api/sync/rows/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });

export const deleteRow = (id: string): Promise<void> =>
  velvetRequest<void>(`/api/sync/rows/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** 用户档案写（对齐原 pb.collection('users').update），返回完整 record */
export const updateProfile = (patch: Record<string, unknown>): Promise<Record<string, unknown>> =>
  velvetRequest<Record<string, unknown>>('/api/sync/profile', { method: 'PUT', body: JSON.stringify(patch) });

/**
 * 上传头像（multipart）。后端存盘并写 users.avatar，返回可访问路径。
 * 对齐原 pb.collection('users').update(id, FormData) 的语义（字段名 file）。
 */
export const uploadAvatar = (blob: Blob, filename = 'avatar.jpg'): Promise<{ avatar: string; size: number }> => {
  const form = new FormData();
  form.append('file', blob, filename);
  // 注意：multipart 不能手动设 Content-Type（浏览器要带 boundary），故这里不传 body 之外的头
  return velvetRequest<{ avatar: string; size: number }>('/api/avatar', { method: 'POST', body: form });
};

/** 清空头像（后端删文件并置 users.avatar 为空）。204 无内容 */
export const clearAvatar = (): Promise<void> =>
  velvetRequest<void>('/api/avatar', { method: 'DELETE' });
