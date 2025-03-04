import React, { useState } from "react";
import { useFormikContext } from "formik";
import {
	Button,
} from "@mui/material";
import {
	IShippingFormValues,
	IShippingRateInfo,
} from "../../../types/shippingForm";
import { Box } from "@mui/system";
import ShippingRates from "./ShippingRates";
import { fetchShippingRates } from "../../../lib/shipping";
import { useAppSelector } from "../../../hooks/redux";

export default function ShippingRatesField() {
	const cartItems = useAppSelector((state) => state.app.items);

	const [allShippingRates, setAllShippingRates] = useState<
		IShippingRateInfo[] | null
	>();
	const [loadingShippingRates, setLoadingShippingRates] = useState(false);
	const [errorLoadingShippingRates, setErrorLoadingShippingRates] =
		useState(false);

	const getShippingRates = async (zip: string) => {
		try {
			setLoadingShippingRates(true);

			const response = await fetchShippingRates(zip, cartItems);

			setAllShippingRates(response);
			setLoadingShippingRates(false);
		} catch (error) {
			setErrorLoadingShippingRates(true);
		}
	};
	const formikProps = useFormikContext<IShippingFormValues>();
	const { values } = formikProps;
	const { shipping_address } = values;

	return (
		<Box sx={{ mt: 2 }}>
			<Button
				variant="contained"
				disabled={!shipping_address?.zip || loadingShippingRates}
				onClick={() => getShippingRates(shipping_address?.zip ?? "")}
				loading={loadingShippingRates}
			>
				Calculate Shipping
			</Button>
			{errorLoadingShippingRates && (
				<span>Error loading shipping rates. Please try again</span>
			)}
			{!loadingShippingRates && !errorLoadingShippingRates && allShippingRates && <ShippingRates rates={allShippingRates} />}
		</Box>
	);
}
