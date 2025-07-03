import React, { useEffect, useState } from "react";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import {
	ICheckoutStepper,
	TCheckoutStep,
	ICustomer,
} from "boundless-api-client";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid"; // Changed from Grid2
import Button from "@mui/material/Button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import { fieldAttrs } from "../lib/formUtils";
import ExtraErrors from "./ExtraErrors";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentIcon from "@mui/icons-material/Payment";
import { addFilledStep, setOrdersCustomer } from "../redux/reducers/app";
import { useNavigate } from "react-router-dom";
import Typography from "@mui/material/Typography";
import { LoginFormView } from "./LoginForm";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { v4 } from "uuid";
import { setLocalStorageCheckoutData } from "../hooks/checkoutData";
import { IOrderWithCustmAttr } from "../types/Order";
import { PhoneInput } from "./PhoneInput";

export interface IContactInformationFormValues {
	email: string; // Changed from optional to required for simplicity with custom validation
	phone: string; // Changed from optional to required for simplicity with custom validation
	first_name: string;
	last_name: string;
	dob: string | null; // Ensure dob can be string or null
	register_me?: boolean;
}

export enum TViewMode {
	contact = "contact",
	login = "login",
}

// Custom validation function
const validateContactForm = (values: IContactInformationFormValues) => {
	const errors: Partial<Record<keyof IContactInformationFormValues, string>> = {};
	const fields = getFieldsList();

	const emailField = fields.find(field => field.type === 'email');
	if (emailField?.required && !values.email) {
		errors.email = 'Email is required';
	} else if (values.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
		errors.email = 'Invalid email address';
	}

	const phoneField = fields.find(field => field.type === 'phone');
	if (phoneField?.required && !values.phone) {
		errors.phone = 'Phone is required';
	}

	if (!values.first_name) {
		errors.first_name = 'First name is required';
	}

	if (!values.last_name) {
		errors.last_name = 'Last name is required';
	}

	const dobField = fields.find(field => field.type === 'dob');
	if (values.dob) {
		const birthDate = dayjs(values.dob);
		const today = dayjs();
		const age = today.diff(birthDate, 'year');
		if (age < 19) {
			errors.dob = 'You must be at least 19 years old';
		}
	} else if (dobField?.required) {
		errors.dob = 'Date of birth is required';
	}

	return errors;
};

export function ContactFormView({
	setViewMode,
}: {
	setViewMode: (mode: TViewMode) => void;
}) {
	const { order, stepper } = useAppSelector((state) => state.app);
	const { loggedInCustomer } = useAppSelector((state) => state.user);
	const { t } = useTranslation();

	useEffect(() => {
		document.title = t("contactForm.pageTitle");
	}, []); //eslint-disable-line

	const fieldsList = getFieldsList();
	const { onSubmit } = useSaveContactInfo();
	const excludedFields = fieldsList.map(({ type }) => type);

	return (
		<Formik<IContactInformationFormValues>
			initialValues={getInitialValues(order!, loggedInCustomer)}
			validate={validateContactForm}
			onSubmit={onSubmit}
			validateOnChange={false}
		>
			{(formikProps: FormikProps<IContactInformationFormValues>) => (
				<Form
					className={clsx("bdl-contact-form", {
						"two-fields": fieldsList.length === 2,
						"one-field": fieldsList.length === 1,
					})}
				>
					{Object.keys(formikProps.errors).length > 0 && (
						<ExtraErrors
							excludedFields={excludedFields}
							errors={formikProps.errors}
						/>
					)}
					<Typography variant="h5" sx={{ mb: 2 }}>
						{t("contactForm.pageHeader")}
					</Typography>
					{/* {!loggedInCustomer && (
						<Typography
							align={"right"}
							variant="body2"
							className={"bdl-contact-form__has-account"}
							gutterBottom
						>
							{t("contactForm.alreadyHaveAccount")}
							<Button
								startIcon={<LoginIcon />}
								variant="text"
								onClick={() => setViewMode(TViewMode.login)}
								sx={{ mx: 1 }}
								size={"small"}
							>
								{t("contactForm.login")}
							</Button>
						</Typography>
					)} */}
					<Grid container spacing={{ xs: 2, md: 3 }}>
						{fieldsList.map(({ type, required }, i) => (
							<Grid size={{ xs: 12, md: 6 }} key={i}>
								{type === "email" && (
									<TextField
										label={t("contactForm.email")}
										variant={"outlined"}
										type={"email"}
										required={required}
										fullWidth
										disabled={Boolean(loggedInCustomer)}
										{...fieldAttrs<IContactInformationFormValues>(
											"email",
											formikProps,
											loggedInCustomer ? t("contactForm.youAreLoggedIn") : ""
										)}
									/>
								)}
								{type === "phone" && (
									<TextField
										label={t("contactForm.phone")}
										variant={"outlined"}
										required={required}
										{...fieldAttrs<IContactInformationFormValues>(
											"phone",
											formikProps
										)}
										fullWidth
										InputProps={{
											inputComponent: PhoneInput as any,
										}}
									/>
								)}
								{type === "first_name" && (
									<TextField
										label={t("contactForm.firstName")}
										variant={"outlined"}
										required={required}
										{...fieldAttrs<IContactInformationFormValues>(
											"first_name",
											formikProps
										)}
										fullWidth
									/>
								)}
								{type === "last_name" && (
									<TextField
										label={t("contactForm.lastName")}
										variant={"outlined"}
										required={required}
										{...fieldAttrs<IContactInformationFormValues>(
											"last_name",
											formikProps
										)}
										fullWidth
									/>
								)}
								{type === "dob" && (
									<DatePicker
										selected={
											formikProps.values.dob
												? new Date(formikProps.values.dob)
												: null
										}
										onChange={(date: Date | null) => {
											formikProps.setFieldValue("dob", date ? dayjs(date).format('YYYY-MM-DD') : null);
										}}
										placeholderText={t("contactForm.dob")}
										dateFormat="MM/dd/yyyy"
										showYearDropdown
										yearDropdownItemNumber={100}
										scrollableYearDropdown
										maxDate={new Date()}
										portalId="date-picker-portal"
										popperClassName="react-datepicker-popper-high-z"
										popperPlacement="bottom-start"
										customInput={
											<TextField
												variant="outlined"
												required={required}
												fullWidth
												name="dob"
												onBlur={formikProps.handleBlur}
												error={
													Boolean(formikProps.errors.dob)
												}
												helperText={
													formikProps.errors.dob
												}
											/>
										}
									/>
								)}
							</Grid>
						))}
						{/* {!loggedInCustomer && (
							<Grid size={{ xs: 12 }}>
								<FormControlLabel
									control={
										<Checkbox {...checkAttrs("register_me", formikProps)} />
									}
									label={t("contactForm.registerMe")}
								/>
							</Grid>
						)} */}
						<Grid size={{ xs: 12 }} sx={{ textAlign: "right" }}>
							<NextStepBtn
								stepper={stepper!}
								isSubmitting={formikProps.isSubmitting}
							/>
						</Grid>
					</Grid>
				</Form>
			)}
		</Formik>
	);
}

const NextStepBtn = ({
	stepper,
	isSubmitting,
}: {
	stepper: ICheckoutStepper;
	isSubmitting: boolean;
}) => {
	const { t } = useTranslation();

	if (stepper.steps.includes(TCheckoutStep.shippingAddress)) {
		return (
			<Button
				variant="contained"
				type={"submit"}
				size="large"
				disabled={isSubmitting}
				startIcon={<LocalShippingIcon />}
				color="success"
			>
				{t("contactForm.continueToShipping")}
			</Button>
		);
	}

	return (
		<Button
			variant="contained"
			type={"submit"}
			size="large"
			disabled={isSubmitting}
			startIcon={<PaymentIcon />}
			color="success"
		>
			{t("contactForm.continueToPayment")}
		</Button>
	);
};

const useSaveContactInfo = () => {
	const { order, stepper, total } = useAppSelector((state) => state.app);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const onSubmit = (
		values: IContactInformationFormValues,
		{ setSubmitting, setErrors }: FormikHelpers<IContactInformationFormValues>
	) => {
		const { email, first_name, last_name, phone, dob } = values;

		// if (customer && authToken) {
		// 	dispatch(setLoggedInCustomer(customer, authToken));
		// }

		const customer = {
			id: v4(),
			email: email ?? null,
			created_at: new Date().toISOString(),
			first_name: first_name,
			last_name: last_name,
			phone: phone ?? null,
			dob: dob ?? "",
			custom_attrs: null,
			addresses: [],
		};

		setLocalStorageCheckoutData({
			order: {
				...(order as IOrderWithCustmAttr),
				customer: customer,
			},
			total: total,
		});
		dispatch(setOrdersCustomer(customer));
		dispatch(addFilledStep({ step: TCheckoutStep.contactInfo }));

		setSubmitting(false);

		const nextUrl = stepper!.steps.includes(TCheckoutStep.shippingAddress)
			? "/shipping-address"
			: "/payment";
		navigate(nextUrl, { replace: true });
	};

	return {
		onSubmit,
	};
};

const getFieldsList = () => {
	const fields: { type: string; required: boolean; show: boolean }[] = [
		"email",
		"phone",
	]
		.map((type) => ({
			type,
			//@ts-ignore
			required: true,
			//@ts-ignore
			show: true,
		}))
		.filter(({ show }) => show);

	//required fields should be first:
	fields.sort((a, b) => {
		if (a.required && !b.required) {
			return -1;
		} else if (!a.required && b.required) {
			return 1;
		}

		return 0;
	});

	fields.push({
		type: "first_name",
		required: true,
		show: true,
	});

	fields.push({
		type: "last_name",
		required: true,
		show: true,
	});

	fields.push({
		type: "dob",
		required: true,
		show: true,
	});

	return fields;
};

const getInitialValues = (
	order: IOrderWithCustmAttr,
	loggedInCustomer: ICustomer | null
): IContactInformationFormValues => {
	const customer = order.customer || loggedInCustomer;

	// Ensure a default empty string for email and phone if customer or their properties are null/undefined
	// Also, handle dob correctly if it might not exist on customer.
	const initialDob = customer && 'dob' in customer ? (customer as any).dob : null;

	return {
		email: customer?.email || "",
		phone: customer?.phone || "",
		first_name: customer?.first_name || "",
		last_name: customer?.last_name || "",
		dob: initialDob || null, // Use the safely accessed dob
		register_me: false,
	};
};

export default function ContactInformationForm() {
	const [viewMode, setViewMode] = useState<TViewMode>(TViewMode.contact);

	if (viewMode === TViewMode.login) {
		return <LoginFormView setViewMode={setViewMode} />;
	} else {
		return <ContactFormView setViewMode={setViewMode} />;
	}
}
