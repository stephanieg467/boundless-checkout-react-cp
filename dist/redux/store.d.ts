import { ThunkAction, Action } from "@reduxjs/toolkit";
export declare const store: import("@reduxjs/toolkit").EnhancedStore<{
    app: import("./reducers/app").IAppState;
    xhr: import("./reducers/xhr").IXHRState;
    user: import("./reducers/user").IUserState;
}, import("redux").UnknownAction, import("@reduxjs/toolkit").Tuple<[import("redux").StoreEnhancer<{
    dispatch: import("redux-thunk").ThunkDispatch<{
        app: import("./reducers/app").IAppState;
        xhr: import("./reducers/xhr").IXHRState;
        user: import("./reducers/user").IUserState;
    }, undefined, import("redux").UnknownAction>;
}>, import("redux").StoreEnhancer]>>;
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
