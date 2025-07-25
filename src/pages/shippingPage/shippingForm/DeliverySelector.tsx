import React from "react";
import { useFormikContext } from "formik";
import {
	FormControl,
	FormControlLabel,
	FormHelperText,
	Radio,
	RadioGroup,
	Typography,
} from "@mui/material";
import { ICheckoutShippingPageData, IDelivery } from "boundless-api-client";
import { IShippingFormValues } from "../../../types/shippingForm";
import StoreMallDirectoryIcon from "@mui/icons-material/StoreMallDirectory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { Box } from "@mui/system";
import { useAppSelector } from "../../../hooks/redux";
import { qualifiesForFreeShipping } from "../../../lib/shipping";

const DeliveryTitle = ({ delivery }: { delivery: IDelivery }) => {
	const iconSx = {
		height: "auto",
		marginRight: "12px",
		maxWidth: "50px",
	};

	return (
		<span>
			{delivery.title === "Self Pickup" && (
				<StoreMallDirectoryIcon fontSize="large" sx={iconSx} />
			)}
			{delivery.title === "Delivery" && (
				<DirectionsCarIcon fontSize="large" sx={iconSx} />
			)}
			{delivery.title === "Shipping" && (
				<LocalShippingIcon fontSize="large" sx={iconSx} />
			)}
		</span>
	);
};

const DeliveryDetails = ({ delivery }: { delivery: IDelivery }) => {
	const { total } = useAppSelector((state) => state.app);
	const details = delivery.description;
	
	const freeShippingApplies = qualifiesForFreeShipping(total);
	
	if (!details) {
		return null;
	}

	return (
		<Box
			sx={{
				padding: "0 10px 0 0",
			}}
		>
			<Typography variant="body1" component="div">
				{details}
			</Typography>
			{delivery.title === "Delivery" && (
				<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
					{freeShippingApplies ? (
						<>
							<span style={{ textDecoration: 'line-through', color: '#999' }}>
								Delivery fee: $4.00
							</span>
							<span style={{ color: '#4a7c4d', fontWeight: 'bold', marginLeft: '8px' }}>
								FREE (Order over $100)
							</span>
						</>
					) : (
						"Delivery fee: $4.00"
					)}
				</Typography>
			)}
			{delivery.title === "Shipping" && freeShippingApplies && (
				<Typography variant="body2" sx={{ mt: 1, color: '#4a7c4d', fontWeight: 'bold' }}>
					FREE SHIPPING (Order over $100)
				</Typography>
			)}
		</Box>
	);
};

type IInPros = Pick<ICheckoutShippingPageData, "options">;

export default function DeliverySelector({ options }: IInPros) {
	const formikProps = useFormikContext<IShippingFormValues>();

	return (
		<Box
			sx={{
				mb: 2,
				background: "#f8f9fa",
				padding: "15px",
			}}
		>
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
								value={delivery.delivery_id}
								control={
									<Radio
										sx={{
											color: "#133e20",
											"&.Mui-checked": {
												color: "#4a7c4d",
											},
										}}
									/>
								}
								sx={{
									mb: 1,
									alignItems: "flex-start",
								}}
								label={
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											width: "100%",
										}}
									>
										<DeliveryDetails delivery={delivery} />
										<DeliveryTitle delivery={delivery} />
									</Box>
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
