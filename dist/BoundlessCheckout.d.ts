import React, { ReactNode } from "react";
import "../styles/styles.scss";
import { TOnThankYouPage, TOnCheckoutInited } from "./redux/reducers/app";
import { TClickedElement } from "./lib/elementEvents";
export interface IBoundlessCheckoutProps {
    onHide: (element: TClickedElement) => void;
    onThankYouPage: TOnThankYouPage;
    cartId?: string;
    basename?: string;
    logo?: string | ReactNode;
    logoSrc?: string;
    logoText?: string;
    onCheckoutInited?: TOnCheckoutInited;
}
export default function BoundlessCheckout(props: IBoundlessCheckoutProps): React.ReactPortal | null;
