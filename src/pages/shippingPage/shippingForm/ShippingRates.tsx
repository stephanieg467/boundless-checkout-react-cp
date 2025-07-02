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
			<Typography variant="body1" gutterBottom component="div">
				{shippingRate.name}
			</Typography>
			<Typography variant="body2" gutterBottom color="text.secondary" component="div">
				{formatCurrency(shippingRate.rate)}
			</Typography>
      <Typography variant="caption" gutterBottom color="text.secondary" component="div">
        `Expected delivery: ${shippingRate.expectedDelivery}`
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
		<Box sx={{ mb: 2 }}>
			<FormControl
				required={true}
				component="fieldset"
				error={Boolean("serviceCode" in errors)}
			>
				<RadioGroup name="serviceCode" onChange={handleChange}>
					{rates.map((shippingRate, i) => (
						<React.Fragment key={i}>
							<FormControlLabel
								className="bdl-shipping-form__shipping-item"
								value={shippingRate.name}
								checked={values.serviceCode === shippingRate.name}
								control={<Radio size="small" required />}
								label={<ShippingTitle shippingRate={shippingRate} />}
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
