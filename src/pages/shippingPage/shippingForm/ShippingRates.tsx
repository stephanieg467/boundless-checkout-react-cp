import React from "react";
import { useFormikContext } from "formik";
import {
	FormControl,
	FormControlLabel,
	FormHelperText,
	FormLabel,
	Radio,
	RadioGroup,
	Typography,
} from "@mui/material";
import {
	IShippingFormValues,
	IShippingRateInfo,
} from "../../../types/shippingForm";
import { Box } from "@mui/system";
import useFormatCurrency from "../../../hooks/useFormatCurrency";

const ShippingTitle = ({
	shippingRate,
}: {
	shippingRate: IShippingRateInfo;
}) => {
	const { formatCurrency } = useFormatCurrency();

	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: 1,
				}}
			>
				<Typography variant="body1" component="span" sx={{ fontWeight: "600" }}>
					{shippingRate.name}
				</Typography>
				<Typography variant="body2" color="text.secondary" component="span">
					{formatCurrency(shippingRate.rate)}
				</Typography>
			</Box>
			<Typography variant="body2" color="text.secondary" component="div">
				Expected delivery: {shippingRate.expectedDelivery}
			</Typography>
		</Box>
	);
};

export default function ShippingRates({
	rates,
}: {
	rates: IShippingRateInfo[];
}) {
	const formikProps = useFormikContext<IShippingFormValues>();
	const { errors, values, handleChange } = formikProps;

	return (
		<Box sx={{ mb: 2, mt: 2 }}>
			<FormControl
				required={true}
				component="fieldset"
				error={Boolean("serviceCode" in errors)}
			>
				<FormLabel 
					component="legend"
					sx={{
						color: "#000",
						fontWeight: "600",
						"&.Mui-focused": {
							color: "#000",
						},
					}}
				>
					Shipping Rate
				</FormLabel>
				<RadioGroup name="serviceCode" onChange={handleChange}>
					{rates.map((shippingRate, i) => (
						<React.Fragment key={i}>
							<FormControlLabel
								className="bdl-shipping-form__shipping-item"
								value={shippingRate.name}
								checked={values.serviceCode === shippingRate.name}
								control={
									<Radio
										size="small"
										sx={{
											color: "#133e20",
											"&.Mui-checked": {
												color: "#4a7c4d",
											},
										}}
									/>
								}
								label={<ShippingTitle shippingRate={shippingRate} />}
								sx={{
									mb: 1,
									alignItems: "flex-start",
								}}
							/>
						</React.Fragment>
					))}
				</RadioGroup>
				{"serviceCode" in errors && (
					<FormHelperText>{errors.serviceCode}</FormHelperText>
				)}
			</FormControl>
		</Box>
	);
}
