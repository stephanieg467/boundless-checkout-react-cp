import {configureStore, ThunkAction, Action} from "@reduxjs/toolkit";
import appReducers, {type IAppState} from "./reducers/app";
import xhrReducers, {type IXHRState} from "./reducers/xhr";

export interface RootState {
	app: IAppState;
	xhr: IXHRState;
}

export const store = configureStore<RootState>({
	reducer: {
		app: appReducers,
		xhr: xhrReducers,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActionPaths: ["payload.api", "payload.promise"],
				ignoredPaths: ["app.api", "xhr.promises"],
			},
		}),
});

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action<string>
>;