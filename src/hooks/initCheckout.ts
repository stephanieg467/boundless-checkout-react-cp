import {useEffect} from "react";
import {useAppSelector} from "./redux";
import {useAppDispatch} from "./redux";
import {initCheckoutByCart} from "../redux/actions/checkout";
import {setGlobalError} from "../redux/reducers/app";
import {useCheckoutConfig} from "../contexts/CheckoutConfigContext";

export default function useInitCheckoutByCart() {
	const {isInited, cartId} = useAppSelector((state) => state.app);
	const dispatch = useAppDispatch();
	const {onCheckoutInited} = useCheckoutConfig();

	useEffect(() => {
		if (cartId) {
			dispatch(initCheckoutByCart({onCheckoutInited}));
		} else {
			dispatch(setGlobalError("Cart ID is not passed to the Checkout component."));
		}
	}, [cartId, dispatch, onCheckoutInited]);

	return {
		isInited
	};
}