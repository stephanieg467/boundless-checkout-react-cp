import { IDelivery, IOrder, ITotal } from "boundless-api-client";
import { IOrderWithCustmAttr } from "../types/Order";
export declare const isPickUpDelivery: (deliveryId: number, deliveryOptions: IDelivery[]) => boolean;
export declare const isDeliveryMethod: (deliveryId: number, deliveryOptions: IDelivery[]) => boolean;
export declare const hasShipping: (order: IOrderWithCustmAttr | IOrder) => boolean;
export declare const qualifiesForFreeShipping: (total: ITotal | undefined) => boolean;
