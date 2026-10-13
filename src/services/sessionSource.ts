/**
 * 「当前该走哪个后端」的唯一判据。
 *
 * 自研后端上线后，各 service 都要回答同一个问题：这次请求打到自研接口还是 PocketBase？
 * 以前这个问题在 5 个文件里各写一遍（都读 localStorage 的 velvet.jwt），改一处容易漏别处；
 * 现在只有这一份。
 *
 * 两条口径刻意分开，别互相替换：
 * · **路由口径**（本文件的 hasBackendSession）：存储里有 jwt 就算。哪怕用户资料那份
 *   （velvet.record）损坏或缺失，请求照样带得上 token 打到后端（后端只认 token），
 *   这条判据更抗损坏。
 * · **会话口径**（velvetApi.isAuthenticated）：token 与资料都在才算已登录，UI 用它。
 *
 * 键名与 velvetApi 的 TOKEN_KEY 是同一个 'velvet.jwt'；这里刻意各存一份字面量，
 * 免得被「mock 掉 velvetApi」的测试把常量带成 undefined。
 */
const TOKEN_KEY = 'velvet.jwt';

/** 存储层是否存在自研会话（见文件头两条口径的说明） */
export const hasBackendSession = (): boolean => {
  try {
    return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false; // 无痕模式等：当没有自研会话处理
  }
};
