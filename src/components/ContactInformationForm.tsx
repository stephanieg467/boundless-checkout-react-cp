import React, { useEffect, useState } from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import {
	IOrder,
	ICheckoutStepper,
	TCheckoutStep,
	ICustomer,
} from "boundless-api-client";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid2";
import Button from "@mui/material/Button";
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
import {
	setLocalStorageCheckoutData,
} from "../hooks/checkoutData";
import { IOrderWithCustmAttr } from "../types/Order";

export interface IContactInformationFormValues {
	email?: string;
	phone?: string;
	first_name: string;
	last_name: string;
	receive_marketing_info?: boolean;
	register_me?: boolean;
}

export enum TViewMode {
	contact = "contact",
	login = "login",
}

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
	// if (!order!.customer && !loggedInCustomer) {
	// 	excludedFields.push('receive_marketing_info');
	// }

	return (
		<Formik
			initialValues={getInitialValues(order!, loggedInCustomer)}
			onSubmit={onSubmit}
		>
			{(formikProps) => (
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
								{type === "first_name" && (
									<TextField
										label={t("contactForm.firstName")}
										variant={"standard"}
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
										variant={"standard"}
										required={required}
										{...fieldAttrs<IContactInformationFormValues>(
											"last_name",
											formikProps
										)}
										fullWidth
									/>
								)}
								{type === "email" && (
									<TextField
										label={t("contactForm.email")}
										variant={"standard"}
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
										variant={"standard"}
										required={required}
										{...fieldAttrs<IContactInformationFormValues>(
											"phone",
											formikProps
										)}
										fullWidth
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
						{/* {excludedFields.includes('receive_marketing_info') &&
						<Grid
									xs={12}
						>
							<FormControlLabel control={
								<Checkbox {...checkAttrs('receive_marketing_info', formikProps)} />
							} label={t('contactForm.receiveMarketingInfo')}/>
						</Grid>
						} */}
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
		const { receive_marketing_info, ...rest } = values;

		// if (customer && authToken) {
		// 	dispatch(setLoggedInCustomer(customer, authToken));
		// }

		const customer = {
			id: v4(),
			email: rest.email ?? null,
			created_at: new Date().toISOString(),
			first_name: rest.first_name,
			last_name: rest.last_name,
			phone: rest.phone ?? null,
			receive_marketing_info: false,
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

		// const promise = api!.checkout
		// 	.saveContactsData({
		// 		order_id,
		// 		...rest,
		// 		receive_marketing_info: false,
		// 	})
		// 	.then(({ customer, authToken }) => {
		// 		if (customer && authToken) {
		// 			dispatch(setLoggedInCustomer(customer, authToken));
		// 		}

		// 		dispatch(setOrdersCustomer(customer));
		// 		dispatch(addFilledStep({ step: TCheckoutStep.contactInfo }));
		// 	})
		// 	.then(async () => {
		// 		const order = await api!.adminOrder.updateOrder(order_id, {
		// 			custom_attrs: {
		// 				first_name: rest.first_name,
		// 				last_name: rest.last_name,
		// 			},
		// 		});

		// 		const nextUrl = stepper!.steps.includes(TCheckoutStep.shippingAddress)
		// 			? "/shipping-address"
		// 			: "/payment";
		// 		navigate(nextUrl, { replace: true });
		// 	})
		// 	.catch((err) => {
		// 		const {
		// 			response: { data },
		// 		} = err;
		// 		setErrors(apiErrors2Formik(data));
		// 	})
		// 	.finally(() => setSubmitting(false));
		// dispatch(addPromise(promise));
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

	return fields;
};

const getInitialValues = (
	order: IOrder,
	loggedInCustomer: ICustomer | null
) => {
	const { customer } = order;
	const initialValues: IContactInformationFormValues = {
		receive_marketing_info: false,
		register_me: false,
		first_name: "",
		last_name: "",
	};

	if (loggedInCustomer) {
		initialValues.email = loggedInCustomer.email!;
		initialValues.phone = loggedInCustomer.phone || "";
	} else if (customer) {
		if (customer.email) {
			initialValues.email = customer.email;
		}

		if (customer.phone) {
			initialValues.phone = customer.phone;
		}
		
		if (customer.first_name) {
			initialValues.first_name = customer.first_name;
		}

		if (customer.last_name) {
			initialValues.last_name = customer.last_name;
		}
	}

	return initialValues;
};

export default function ContactInformationForm() {
	const [viewMode, setViewMode] = useState<TViewMode>(TViewMode.contact);

	if (viewMode === TViewMode.login) {
		return <LoginFormView setViewMode={setViewMode} />;
	} else {
		return <ContactFormView setViewMode={setViewMode} />;
	}
}
