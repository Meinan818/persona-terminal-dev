import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
/** 弹层统一挂到 body（与原生 document.body.appendChild 一致，position:fixed 不受页面 transform 影响）。 */
export const Portal = ({ children }: { children: ReactNode }) => createPortal(children, document.body);
