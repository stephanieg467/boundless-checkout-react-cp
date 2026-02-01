import React from "react";
import {useFormikContext} from "formik";
import {
	FormControl,
	FormControlLabel,
	FormHelperText,
	Radio,
	RadioGroup,
	Typography,
} from "@mui/material";
import {ICheckoutShippingPageData, IDelivery} from "boundless-api-client";
import {IShippingFormValues} from "../../../types/shippingForm";
import StoreMallDirectoryIcon from "@mui/icons-material/StoreMallDirectory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import {Box} from "@mui/system";
import {useAppSelector} from "../../../hooks/redux";
import {qualifiesForFreeShipping} from "../../../lib/shipping";
import {DELIVERY_ID, SHIPPING_COST} from "../../../constants";
import {useDeliveryTimes} from "../../../hooks/useDeliveryTimes";
import {isDeliveryDisabled} from "../../../lib/deliveryTimes";

const DeliveryTitle = ({delivery}: { delivery: IDelivery }) => {
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

const DeliveryDetails = ({delivery}: { delivery: IDelivery }) => {
	const {total} = useAppSelector((state) => state.app);
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
				<Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
					{freeShippingApplies ? (
						<>
							<span style={{textDecoration: "line-through", color: "#999"}}>
								Delivery fee: $4.00
							</span>
							<span
								style={{
									color: "#4a7c4d",
									fontWeight: "bold",
									marginLeft: "8px",
								}}
							>
								FREE (Order over $100)
							</span>
						</>
					) : (
						"Delivery fee: $4.00"
					)}
				</Typography>
			)}
			{delivery.title === "Shipping" && (
				<Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
					{freeShippingApplies ? (
						<>
							<span style={{textDecoration: "line-through", color: "#999"}}>
								{`Shipping fee: $${SHIPPING_COST}`}
							</span>
							<span
								style={{
									color: "#4a7c4d",
									fontWeight: "bold",
									marginLeft: "8px",
								}}
							>
								FREE SHIPPING (Order over $100)
							</span>
						</>
					) : (
						`Shipping fee: $${SHIPPING_COST}`
					)}
				</Typography>
			)}
		</Box>
	);
};

type IInPros = Pick<ICheckoutShippingPageData, "options">;

export default function DeliverySelector({options}: IInPros) {
	const formikProps = useFormikContext<IShippingFormValues>();
	const {rawData: deliveryTimesData} = useDeliveryTimes();

	// Check if delivery should be disabled based on time cutoff
	const deliveryDisabled = deliveryTimesData
		? isDeliveryDisabled(deliveryTimesData)
		: false;

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
					{options.delivery.map((delivery) => {
						const isDeliveryOption = delivery.delivery_id === DELIVERY_ID;
						const isDisabled = isDeliveryOption && deliveryDisabled;

						return (
							<React.Fragment key={delivery.delivery_id}>
								<FormControlLabel
									value={delivery.delivery_id}
									disabled={isDisabled}
									control={
										<Radio
											sx={{
												color: isDisabled ? "#ccc" : "#133e20",
												"&.Mui-checked": {
													color: "#4a7c4d",
												},
												"&.Mui-disabled": {
													color: "#ccc",
												},
											}}
										/>
									}
									sx={{
										mb: 1,
										alignItems: "flex-start",
										opacity: isDisabled ? 0.6 : 1,
									}}
									label={
										<Box
											sx={{
												display: "flex",
												flexDirection: "column",
												width: "100%",
											}}
										>
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
											{isDisabled && (
												<Typography
													variant="body2"
													sx={{
														color: "#d32f2f",
														fontStyle: "italic",
														mt: 0.5,
													}}
												>
													Delivery is closed for today. Please check back after 12AM for tomorrows delivery hours.
												</Typography>
											)}
										</Box>
									}
								/>
							</React.Fragment>
						);
					})}
				</RadioGroup>
				{"delivery_id" in formikProps.errors && (
					<FormHelperText>{formikProps.errors.delivery_id}</FormHelperText>
				)}
			</FormControl>
		</Box>
	);
}
