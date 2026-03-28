export declare const pushPromise: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    promise: Promise<any>;
}, "xhr/pushPromise">, cleanPromises: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"xhr/cleanPromises">, resetXhrState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"xhr/resetXhrState">;
declare const _default: import("redux").Reducer<IXHRState>;
export default _default;
export interface IXHRState {
    promises: Promise<any>[];
}
