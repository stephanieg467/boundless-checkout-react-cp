import {AppThunk} from '../store';
import {setCheckoutData, setCheckoutInited, setGlobalError} from '../reducers/app';
import {setLoggedInCustomer, userCookieName} from './user';
import Cookie from 'js-cookie';
import {TClickedElement} from '../../lib/elementEvents';
import addImagesToItems from '../../lib/addImagesToItems';

export const initCheckoutByCart = (): AppThunk => async (dispatch, getState) => {
	const {api, cartId, onCheckoutInited, onHide} = getState().app;

	const customerAuthToken = Cookie.get(userCookieName);
	if (customerAuthToken) {
		api!.setCustomerAuthToken(customerAuthToken);
	}

	api!.checkout.init(cartId!)
		.then(async (data) => {
			if (!data.items.length) {
				dispatch(setGlobalError('Your cart is empty. Please go back to the site and start shopping.'));

				return;
			}

			const {items} = data;
			const itemsWithImages = await addImagesToItems(items, api!);

			dispatch(setCheckoutData({...data, items: itemsWithImages}));

			if (data.loggedInCustomer) {
				dispatch(setLoggedInCustomer(data.loggedInCustomer, customerAuthToken!));
			} else {
				if (customerAuthToken) {
					Cookie.remove(userCookieName);
				}
			}

			dispatch(setCheckoutInited({isInited: true}));

			if (onCheckoutInited) {
				onCheckoutInited(data);
			}
		})
		.catch(({response: {data}}) => {
			console.error(data);
			const isCartError = (Array.isArray(data) && data[0]?.field && data[0]?.message) ? true : false;

			if (isCartError && onHide) {
				onHide(TClickedElement.backToCart, data[0]?.message as string);
			} else {
				dispatch(setGlobalError('Cannot initialize checkout. Please go back to the cart and try again.'));
			}
		});
};