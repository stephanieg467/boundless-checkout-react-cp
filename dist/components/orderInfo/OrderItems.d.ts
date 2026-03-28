import { IOrderWithCustmAttr } from "../../types/Order";
import { CovaCartItem } from "../../types/cart";
import { ITotal } from "boundless-api-client";
export default function OrderItems({ order, total, items, }: {
    total: ITotal;
    order: IOrderWithCustmAttr;
    items: CovaCartItem[];
}): import("react/jsx-runtime").JSX.Element;
