import {AppThunk} from "../store";
import {resetAppState} from "../reducers/app";
import {resetXhrState} from "../reducers/xhr";

export const resetState = () : AppThunk => async (dispatch) => {
	dispatch(resetAppState());
	dispatch(resetXhrState());
};