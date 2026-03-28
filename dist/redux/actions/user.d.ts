import { AppThunk } from "../store";
import { ICustomer } from "boundless-api-client";
export declare const userCookieName = "c_customer_auth";
export declare const setLoggedInCustomer: (customer: ICustomer, authToken: string) => AppThunk;
