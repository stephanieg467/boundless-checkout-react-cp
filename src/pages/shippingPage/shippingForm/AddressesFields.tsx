import React from "react";
import { useFormikContext } from "formik";
import { IShippingFormValues } from "../../../types/shippingForm";
import { ICheckoutShippingPageData } from "boundless-api-client";
import { Box } from "@mui/system";
import { Typography } from "@mui/material";
import AddressFieldset from "./AddressFieldset";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { checkAttrs } from "../../../lib/formUtils";
import { useTranslation } from "react-i18next";

export default function AddressesFields({
	shippingPage,
}: {
	shippingPage: ICheckoutShippingPageData;
}) {
	const formikProps = useFormikContext<IShippingFormValues>();
	const { t } = useTranslation();

	const { values } = formikProps;
	if (!values.delivery_id) return null;

	return (
		<>
			<Box className="bdl-shipping-form__address-form" sx={{ mb: 2 }}>
				<Typography variant="h6">{t("addresses.shippingAddress")}</Typography>
				<AddressFieldset
					countries={shippingPage.options.country}
					keyPrefix={"shipping_address"}
					showPhone
				/>
			</Box>
			<Box sx={{ mb: 2 }}>
				<FormControlLabel
					control={
						<Checkbox
							value={true}
							{...checkAttrs("billing_address_the_same", formikProps)}
						/>
					}
					label={t("addresses.billingTheSame")}
				/>
			</Box>
			{!values.billing_address_the_same && (
				<Box className="bdl-shipping-form__address-form" sx={{ mb: 2 }}>
					<Typography variant="h6">{t("addresses.billingAddress")}</Typography>
					<AddressFieldset
						countries={shippingPage.options.country}
						keyPrefix={"billing_address"}
					/>
				</Box>
			)}
		</>
	);
}
