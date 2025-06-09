import React from "react";
import { useFormikContext } from "formik";
import {
	FormControl,
	FormControlLabel,
	FormHelperText,
	Radio,
	RadioGroup,
} from "@mui/material";
import { ICheckoutShippingPageData, IDelivery } from "boundless-api-client";
import { IShippingFormValues } from "../../../types/shippingForm";
import StoreMallDirectoryIcon from "@mui/icons-material/StoreMallDirectory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Box } from "@mui/system";

type IInPros = Pick<ICheckoutShippingPageData, "options">;

const DeliveryTitle = ({ delivery }: { delivery: IDelivery }) => {
	return (
		<span>
			{delivery.title === "Self Pickup" && (
				<StoreMallDirectoryIcon
					className="bdl-shipping-form__shipping-img"
					fontSize="large"
				/>
			)}
			{(delivery.title === "Shipping" || delivery.title === "Delivery") && (
				<LocalShippingIcon
					className="bdl-shipping-form__shipping-img"
					fontSize="large"
				/>
			)}
		</span>
	);
};

const DeliveryDetails = ({ delivery }: { delivery: IDelivery }) => {
	let details = "";
	if (delivery.description) {
		details = delivery.description;
	}

	return (
		<div className="bdl-shipping-form__shipping-details">
			{details && <div dangerouslySetInnerHTML={{ __html: details }} />}
		</div>
	);
};

export default function DeliverySelector({ options }: IInPros) {
	const formikProps = useFormikContext<IShippingFormValues>();

	return (
		<Box className="bdl-shipping-form__address-form" sx={{ mb: 2 }}>
			<FormControl
				component="fieldset"
				error={Boolean("delivery_id" in formikProps.errors)}
			>
				<RadioGroup
					name="delivery_id"
					onChange={formikProps.handleChange}
					value={formikProps.values.delivery_id}
				>
					{options.delivery.map((delivery) => (
						<React.Fragment key={delivery.delivery_id}>
							<FormControlLabel
								className="bdl-shipping-form__shipping-item"
								value={delivery.delivery_id}
								control={<Radio size="small" />}
								label={
									<div className="bdl-shipping-form__shipping-label">
										<DeliveryDetails delivery={delivery} />
										<DeliveryTitle delivery={delivery} />
									</div>
								}
							/>
						</React.Fragment>
					))}
				</RadioGroup>
				{"delivery_id" in formikProps.errors && (
					<FormHelperText>{formikProps.errors.delivery_id}</FormHelperText>
				)}
			</FormControl>
		</Box>
	);
}
