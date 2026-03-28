import { IOrderService } from "boundless-api-client";
import { ICovaCustomer } from "../../types/Order";
export default function OrderShipping({ services, customer, hasShipping, }: {
    services: IOrderService[];
    customer: ICovaCustomer | null;
    hasShipping: boolean;
}): import("react/jsx-runtime").JSX.Element | null;
