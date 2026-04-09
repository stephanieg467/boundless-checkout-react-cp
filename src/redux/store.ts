import {configureStore, ThunkAction, Action} from "@reduxjs/toolkit";
import appReducers from "./reducers/app";
import xhrReducers from "./reducers/xhr";

export const store = configureStore({
	reducer: {
		app: appReducers,
		xhr: xhrReducers
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActionPaths: [
					"payload.onHide",
					"payload.onThankYouPage",
					"payload.api",
					"payload.logo",
					"payload.promise",
					"payload.onCheckoutInited"
				],
				ignoredPaths: [
					"app.onHide",
					"app.api",
					"app.logo",
					"app.onThankYouPage",
					"xhr.promises",
					"app.onCheckoutInited"
				],
			},
		})
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action<string>
>;