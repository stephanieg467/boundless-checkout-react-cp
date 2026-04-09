import { Box, Typography, TextField } from "@mui/material";
import { fieldAttrs } from "../../lib/formUtils";
import { CovaCartItem } from "../../types/cart";
import { FormikProps, FormikValues } from "formik";

export function DeliveryTimeSelector<TFormValues extends FormikValues>({
	items,
	field,
	helperText,
	children,
	formikProps,
}: {
	items?: CovaCartItem[];
	field: string;
	helperText: string;
	children: React.ReactNode;
	formikProps: FormikProps<TFormValues>;
}) {
	const styles = {
		"& .MuiFormHelperText-root": {
			fontSize: "1rem",
			fontWeight: "bold",
		},
	};

	return (
		<Box sx={{ mb: 2 }}>
			{items && (
				<>
					<Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
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
				slotProps={{ select: { native: true } }}
				helperText={helperText}
				sx={styles}
				{...fieldAttrs(field, formikProps)}
			>
				{children}
			</TextField>
		</Box>
	);
}
