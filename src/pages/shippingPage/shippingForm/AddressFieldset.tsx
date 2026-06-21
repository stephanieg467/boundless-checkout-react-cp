import React from "react";
import Grid from "@mui/material/Grid";
import {FormikProps, useFormikContext} from "formik";
import TextField from "@mui/material/TextField";
import {IFieldAttrs} from "../../../lib/formUtils";
import {
	IAddressSubForm,
	IShippingFormValues,
} from "../../../types/shippingForm";
import {useTranslation} from "react-i18next";
import {PhoneInput} from "../../../components/PhoneInput";

export default function AddressFieldset({
	showPhone,
	keyPrefix,
}: IProps) {
	const formikProps = useFormikContext<IShippingFormValues>();
	const {values, handleChange} = formikProps;

	const {t} = useTranslation();

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
	showPhone?: boolean;
	keyPrefix: "shipping_address" | "billing_address";
}

function addressFieldAttrs(
	keyPrefix: "shipping_address" | "billing_address",
	field: string,
	formikProps: FormikProps<IShippingFormValues>,
	helperText: string = ""
): IFieldAttrs {
	const {errors, values, handleChange} = formikProps;
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
