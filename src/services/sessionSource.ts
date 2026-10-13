/**
 * 存储层的自研登录态判据。
 *
 * 回答「本机现在有没有自研后端登录态」。PocketBase 退役后数据面只剩自研后端，
 * 所以这里不再承担「两个数据源怎么分流」的角色，目前的使用者是 AI 代理开关：
 * aiClient 每次解析配置时同步一次——只有登录了自研后端，才谈得上把 AI 请求改道到后端代理。
 *
 * 两条口径刻意分开，别互相替换：
 * · **存储口径**（本文件的 hasBackendSession）：存储里有 jwt 就算。哪怕用户资料那份
 *   （velvet.record）损坏或缺失，请求照样带得上 token 打到后端（后端只认 token），
 *   这条判据更抗损坏；AI 代理开关用它。
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
