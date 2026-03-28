import { ReactNode } from "react";
import { Root } from "react-dom/client";
import { IBoundlessCheckoutProps } from "./BoundlessCheckout";
import { BoundlessOrderInfoProps } from "./BoundlessOrderInfo";
/**
 * @deprecated Internal wrapper used by startCheckout/startOrderInfo.
 * Use the exported React components directly instead.
 */
export declare class StarterWrapper {
    protected el: HTMLElement;
    protected component: ReactNode;
    protected root?: Root;
    constructor(el: HTMLElement, component: ReactNode);
    start(): void;
    destroy(): void;
}
/**
 * @deprecated Use the `<BoundlessCheckout>` component directly instead.
 * This function calls ReactDOM.createRoot() which causes React version
 * mismatches in Next.js App Router environments.
 *
 * @example
 * // New API — render directly in your JSX tree:
 * <BoundlessCheckout
 *   cartId={cartId}
 *   onHide={onHide}
 *   onThankYouPage={onThankYouPage}
 *   basename="/checkout"
 *   logoSrc={logoSrc}
 * />
 */
export declare function startCheckout(el: HTMLElement, props: Omit<IBoundlessCheckoutProps, "logo"> & {
    logoSrc?: string;
    logoText?: string;
}): StarterWrapper;
/**
 * @deprecated Use the `<BoundlessOrderInfo>` component directly instead.
 */
export declare function startOrderInfo(el: HTMLElement, props: BoundlessOrderInfoProps): StarterWrapper;
export declare function resetCheckoutState(): void;
