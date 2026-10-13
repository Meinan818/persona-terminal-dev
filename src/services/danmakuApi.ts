/**
 * danmakuApi —— 弹幕的自研后端数据源（社交迁移 W5）。
 *
 * 后端契约见 DanmakuController（/api/danmaku）：
 *   GET    /api/danmaku?limit=N        → {items:[{id,text}]}（仅 approved，倒序）
 *   POST   /api/danmaku {text,theme}   → {id,text}
 *   POST   /api/danmaku/{id}/report    → {ok}（幂等，静默）
 *   GET    /api/danmaku/{id}           → {id,text}（approved）；否则 404
 *
 * 匿名不受影响：后端表里本就没有作者列，这里也不传任何用户身份。
 * 过审自查沿用「id 即凭据」——GET /{id} 200 = 已过审、404 = 还没结果。
 */
import { velvetRequest, VelvetApiError } from './velvetApi';

export interface DanmakuApiItem { id: string; text: string }

/** 已过审弹幕（仅 approved）。失败抛错（调用方降级为空）。 */
export async function listApproved(limit: number): Promise<DanmakuApiItem[]> {
  const res = await velvetRequest<{ items: DanmakuApiItem[] }>(`/api/danmaku?limit=${limit}`);
  return (res.items ?? [])
    .map(it => ({ id: String(it.id ?? ''), text: String(it.text ?? '').trim() }))
    .filter(it => it.text);
}

/** 投稿（后端自动过审，见 DanmakuService）。返回新条目。 */
export async function submit(text: string, theme: string): Promise<DanmakuApiItem> {
  const res = await velvetRequest<DanmakuApiItem>('/api/danmaku', {
    method: 'POST',
    body: JSON.stringify({ text, theme }),
  });
  return { id: String(res.id ?? ''), text: String(res.text ?? '').trim() };
}

/**
 * 过审自查：返回 true = 已过审（GET /{id} 拿到 200）；false = 还没结果（404）。
 * 其它错误（断网/5xx）抛出，由调用方按「还没结果」保留待查条目。
 */
export async function isApproved(id: string): Promise<boolean> {
  try {
    await velvetRequest<DanmakuApiItem>(`/api/danmaku/${id}`);
    return true;
  } catch (err) {
    if (err instanceof VelvetApiError && err.status === 404) return false;
    throw err;
  }
}

/** 举报（幂等静默，后端 (danmaku,reporter_id) 唯一）。 */
export async function report(id: string, reason: string): Promise<void> {
  await velvetRequest<{ ok: boolean }>(`/api/danmaku/${id}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
