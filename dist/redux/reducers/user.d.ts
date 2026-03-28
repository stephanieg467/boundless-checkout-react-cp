import { ICustomer } from "boundless-api-client";
export declare const login: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    loggedInCustomer: ICustomer;
    authToken: string;
}, "user/login">, logout: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"user/logout">, resetUserState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"user/resetUserState">;
declare const _default: import("redux").Reducer<IUserState>;
export default _default;
export interface IUserState {
    loggedInCustomer: ICustomer | null;
    authToken: string | null;
}
