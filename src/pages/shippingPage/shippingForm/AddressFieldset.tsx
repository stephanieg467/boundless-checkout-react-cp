import React from "react";
import { IVWCountry } from "boundless-api-client";
import Grid from "@mui/material/Grid";
import { FormikProps, useFormikContext } from "formik";
import TextField from "@mui/material/TextField";
import { IFieldAttrs } from "../../../lib/formUtils";
import {
	IAddressSubForm,
	IShippingFormValues,
} from "../../../types/shippingForm";
import { useTranslation } from "react-i18next";
import { PhoneInput } from "../../../components/PhoneInput";

export default function AddressFieldset({
	countries,
	showPhone,
	keyPrefix,
}: IProps) {
	const formikProps = useFormikContext<IShippingFormValues>();
	const { values, handleChange } = formikProps;

	const { t } = useTranslation();

	return (
		<Grid container spacing={2}>
			<Grid size={6}>
				<TextField
					label={t("addresses.firstName")}
					variant={"outlined"}
					required={true}
					fullWidth
					{...addressFieldAttrs(keyPrefix, "first_name", formikProps)}
				/>
			</Grid>
			<Grid size={6}>
				<TextField
					label={t("addresses.lastName")}
					variant={"outlined"}
					required
					fullWidth
					{...addressFieldAttrs(keyPrefix, "last_name", formikProps)}
				/>
			</Grid>
			<Grid size={12}>
				<TextField
					label={t("addresses.addressLine1")}
					variant={"outlined"}
					required
					fullWidth
					{...addressFieldAttrs(keyPrefix, "address_line_1", formikProps)}
				/>
			</Grid>
			<Grid size={12}>
				<TextField
					label={t("addresses.addressLine2")}
					variant={"outlined"}
					required={false}
					fullWidth
					{...addressFieldAttrs(keyPrefix, "address_line_2", formikProps)}
				/>
			</Grid>
			<Grid size={6}>
				<TextField
					label={t("addresses.zip")}
					variant={"outlined"}
					required
					fullWidth
					{...addressFieldAttrs(keyPrefix, "zip", formikProps)}
				/>
			</Grid>
			<Grid size={6}>
				<TextField
					label={t("addresses.city")}
					variant={"outlined"}
					required
					fullWidth
					{...addressFieldAttrs(keyPrefix, "city", formikProps)}
				/>
			</Grid>
			<Grid size={6}>
				<TextField
					label={t("addresses.state")}
					variant={"outlined"}
					fullWidth
					required
					{...addressFieldAttrs(keyPrefix, "state", formikProps)}
				/>
			</Grid>
			{/* // @todo: Currently only supporting Canada. */}
			{/* <Grid item xs={6}>
				<TextField
					label={t("addresses.country")}
					variant={"outlined"}
					fullWidth
					select
					disabled
					SelectProps={{ native: true }}
					{...addressFieldAttrs(keyPrefix, "country_id", formikProps)}
					// @todo: hard code Canada country code.
					value={40}
					helperText="Currently only shipping within Canada"
				>
					<option>Select country</option>
					{countries.map(({ country_id, title }) => (
						<option key={country_id} value={country_id}>
							{title}
						</option>
					))}
				</TextField>
			</Grid> */}
			{showPhone && (
				<Grid size={6}>
					<TextField
						label={t("addresses.phone")}
						variant={"outlined"}
						fullWidth
						{...addressFieldAttrs(keyPrefix, "phone", formikProps)}
						InputProps={{
							inputComponent: PhoneInput as any,
						}}
					/>
				</Grid>
			)}
			{keyPrefix === "shipping_address" && (
				<Grid size={12}>
					<TextField
						label={"Delivery Instructions"}
						name={"deliveryInstructions"}
						variant={"outlined"}
						fullWidth
						multiline
						rows={2}
						value={values.deliveryInstructions || ""}
						onChange={handleChange}
					/>
				</Grid>
			)}
		</Grid>
	);
}

interface IProps {
	countries: IVWCountry[];
	showPhone?: boolean;
	keyPrefix: "shipping_address" | "billing_address";
}

export interface IAddressFields {
	first_name?: string;
	last_name?: string;
	company?: string;
	address_line_1?: string;
	address_line_2?: string;
	city?: string;
	state?: string;
	country_id?: number | string;
	zip?: string;
	phone?: string;
}

export function addressFieldAttrs(
	keyPrefix: "shipping_address" | "billing_address",
	field: string,
	formikProps: FormikProps<IShippingFormValues>,
	helperText: string = ""
): IFieldAttrs {
	const { errors, values, handleChange } = formikProps;
	const addressValues = values[keyPrefix] as IAddressSubForm;

	const fullName = `${keyPrefix}.${field}`;
	let error = false;
	//@ts-ignore
	if (fullName in errors && errors[fullName]) {
		error = true;
		//@ts-ignore
		helperText = errors[fullName] as string;
	}

	const out: IFieldAttrs = {
		name: fullName,
		error,
		value: "",
		onChange: handleChange,
	};

	//@ts-ignore
	if (field in addressValues && addressValues[field] !== null) {
		//@ts-ignore
		out.value = addressValues[field];
	}

	if (helperText) out.helperText = helperText;

	return out;
}
