import { ICovaCustomer } from "../types/customer";
import { IOrderWithCustmAttr } from "../types/Order";
export declare const useCustomer: (order?: IOrderWithCustmAttr) => {
    customer: ICovaCustomer | undefined;
    isSuccess: boolean;
    isError: boolean;
    error: Error | null;
};
