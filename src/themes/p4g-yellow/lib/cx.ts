/** 极简 className 拼接（不引第三方依赖）。falsy 值会被忽略。 */
export const cx = (...parts: Array<string | false | null | undefined | 0>): string =>
  parts.filter(Boolean).join(' ');
