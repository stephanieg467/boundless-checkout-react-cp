import { ICheckoutStepper, TCheckoutStep, ICurrency, ILocaleSettings, ISystemTax, ITotal } from "boundless-api-client";
import { ReactNode } from "react";
import { TClickedElement } from "../../lib/elementEvents";
import { CovaCartItem, CovaCheckoutInitData } from "../../types/cart";
import { ICovaCustomer, IOrderWithCustmAttr } from "../../types/Order";
export declare const setBasicProps: import("@reduxjs/toolkit").ActionCreatorWithPayload<Required<Pick<IAppState, "onHide" | "onThankYouPage">> & {
    basename?: string;
    logo?: string | ReactNode;
    cartId?: string;
    onCheckoutInited?: TOnCheckoutInited;
}, "app/setBasicProps">, showCheckout: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"app/showCheckout">, hideCheckout: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"app/hideCheckout">, setCheckoutData: import("@reduxjs/toolkit").ActionCreatorWithPayload<Required<Pick<IAppState, "items" | "order" | "currency" | "localeSettings" | "stepper" | "total">>, "app/setCheckoutData">, addFilledStep: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    step: TCheckoutStep;
}, "app/addFilledStep">, setOrdersCustomer: import("@reduxjs/toolkit").ActionCreatorWithPayload<ICovaCustomer, "app/setOrdersCustomer">, setGlobalError: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "app/setGlobalError">, setOrder: import("@reduxjs/toolkit").ActionCreatorWithPayload<IOrderWithCustmAttr, "app/setOrder">, setCheckoutInited: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    isInited: boolean;
}, "app/setCheckoutInited">, resetAppState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"app/resetAppState">, setTotal: import("@reduxjs/toolkit").ActionCreatorWithPayload<ITotal, "app/setTotal">, setIsInited: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "app/setIsInited">, setLocaleSettings: import("@reduxjs/toolkit").ActionCreatorWithPayload<ILocaleSettings, "app/setLocaleSettings">, setCurrentStep: import("@reduxjs/toolkit").ActionCreatorWithPayload<TCheckoutStep, "app/setCurrentStep">;
declare const _default: import("redux").Reducer<IAppState>;
export default _default;
export type TOnThankYouPage = ({ orderId, error, }: {
    orderId: string;
    error?: string;
}) => void;
export type TOnCheckoutInited = (data: CovaCheckoutInitData) => void;
export interface IAppState {
    show: boolean;
    isInited: boolean;
    globalError: string | null;
    basename?: string;
    onHide?: (element: TClickedElement, error?: string) => void;
    onThankYouPage?: TOnThankYouPage;
    cartId?: string;
    items?: CovaCartItem[];
    order?: IOrderWithCustmAttr;
    currency?: ICurrency;
    localeSettings?: ILocaleSettings;
    taxSettings?: ISystemTax;
    logo?: string | ReactNode;
    stepper?: ICheckoutStepper | null;
    onCheckoutInited?: TOnCheckoutInited;
    total?: ITotal;
}
