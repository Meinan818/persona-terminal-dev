/** 极简 className 拼接（falsy 忽略）。 */
export const cx = (...parts: Array<string | false | null | undefined | 0>): string => parts.filter(Boolean).join(' ');
