import {Box, Typography, TextField} from "@mui/material";
import {fieldAttrs} from "../../lib/formUtils";
import {CovaCartItem} from "../../types/cart";
import {FormikProps, FormikValues} from "formik";
import type {DeliveryTimeOption} from "../../lib/deliveryTimes";

/**
 * @param option Delivery slot to label.
 * @param quoteFee Saved quote fee; omitted on the address step, even for previously quoted orders.
 * @returns Slot text with a free-slot annotation or the confirmed fee when available.
 */
export const getDeliveryTimeOptionText = (
	option: DeliveryTimeOption,
	quoteFee?: string,
): string =>
	option.applyDeliveryFee === false
		? `${option.label} — Free delivery`
		: quoteFee !== undefined
			? `${option.label} — $${quoteFee} delivery fee`
			: option.label;

/**
 * @param times Available delivery slots.
 * @param isLoading Whether slots are loading.
 * @param hasError Whether loading failed.
 * @param quoteFee Saved quote fee, only supplied after the address step.
 * @returns Select options preserving slot labels as values.
 */
export const renderDeliveryTimeOptions = (
	times: DeliveryTimeOption[] | undefined,
	isLoading: boolean,
	hasError: boolean,
	quoteFee?: string,
) => (
	<>
		<option value=""></option>
		{isLoading ? (
			<option disabled value="">
				{"Loading delivery times..."}
			</option>
		) : !hasError && times ? (
			times.map((option) => (
				<option key={option.label} value={option.label}>
					{getDeliveryTimeOptionText(option, quoteFee)}
				</option>
			))
		) : (
			<option disabled>
				{
					"Error loading delivery times. Please contact info@cannabis-cottage.ca."
				}
			</option>
		)}
	</>
);

export function DeliveryTimeSelector<TFormValues extends FormikValues>({
	items,
	field,
	helperText,
	children,
	formikProps,
	showDeliveryFor = false
}: {
	items?: CovaCartItem[];
	field: string;
	helperText: string;
	children: React.ReactNode;
	formikProps: FormikProps<TFormValues>;
	showDeliveryFor?: boolean;
}) {
	const styles = {
		"& .MuiFormHelperText-root": {
			fontSize: "1rem",
			fontWeight: "bold",
		},
	};

	return (
		<Box sx={{mb: 2}}>
			{items && showDeliveryFor && (
				<>
					<Typography variant="subtitle1" sx={{mb: 1, fontWeight: "bold"}}>
						{"Delivery for:"}
					</Typography>
					<ul>
						{items.map((item, i) => {
							return <li key={i}>{item.product.Name}</li>;
						})}
					</ul>
				</>
			)}
			<TextField
				required={true}
				label="Delivery time"
				variant={"outlined"}
				fullWidth
				select
				slotProps={{select: {native: true}}}
				helperText={helperText}
				sx={styles}
				{...fieldAttrs(field, formikProps)}
			>
				{children}
			</TextField>
		</Box>
	);
}
