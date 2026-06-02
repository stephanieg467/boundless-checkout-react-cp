"use client";

import {PaymentValidationError} from "../../../lib/paymentOutcome";
import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Alert,
	Box,
	CircularProgress,
	Grid,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import {Theme} from "@mui/material/styles";
import {Country, State, type ICountry, type IState} from "country-state-city";
import PayfirmaIframeTransaction from "merrco-payfirma-simple-pay-module";
import {ICheckoutData} from "../../../types/Order";
import {getCheckoutData} from "../../../hooks/checkoutData";
import {useAppSelector} from "../../../hooks/redux";
import {useCheckoutConfig} from "../../../contexts/CheckoutConfigContext";
import {applyCreditCardTipToSession} from "../../../lib/paymentOutcome";

type PaymentTokenResponse = {
	payment_token: string;
};

type PayfirmaPayment = {
	getPaymentToken: () => Promise<PaymentTokenResponse>;
};

type PayfirmaInputStyle = Record<string, string>;

type PayfirmaOptions = {
	environment?: string;
	style?: {
		input: PayfirmaInputStyle;
	};
};

type PayHQProps = {
	order?: ICheckoutData["order"];
	items?: ICheckoutData["items"];
	total?: ICheckoutData["total"];
	tip?: string;
	onPaymentFailed: (errorMessage: string) => void;
	createPaymentInstance?: CreatePaymentInstance;
};

export type PayHQHandle = {
	submitPayment: () => Promise<{paidAt: string}>;
};

export type CreatePaymentInstance = (
	apiKey: string,
	containerId: string,
	options: PayfirmaOptions,
) => PayfirmaPayment;

type PayfirmaFieldMetrics = {
	height: string;
	fontSize: string;
};

type RequiredPaymentField =
	| "firstName"
	| "lastName"
	| "email"
	| "address1"
	| "city"
	| "country"
	| "postalCode"
	| "province";

type RequiredPaymentFieldErrors = Partial<Record<RequiredPaymentField, string>>;
type RequiredPaymentFieldElement =
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement;

const requiredPaymentFieldOrder: RequiredPaymentField[] = [
	"firstName",
	"lastName",
	"email",
	"address1",
	"city",
	"country",
	"postalCode",
	"province",
];

type PaymentAddressFields = {
	address1: string;
	address2: string;
	city: string;
	country: string;
	postalCode: string;
	province: string;
};

type CustomerAddress = NonNullable<
	NonNullable<ICheckoutData["order"]>["customer"]
>["addresses"][number];

const requiredPaymentFieldErrorMessages: Record<RequiredPaymentField, string> = {
	firstName: "First name is required",
	lastName: "Last name is required",
	email: "Email is required",
	address1: "Address 1 is required",
	city: "City is required",
	country: "Country is required",
	postalCode: "Postal code is required",
	province: "Province/State is required",
};

const resolvePaidAt = (paidAt: unknown): string => {
	if (typeof paidAt === "string" && paidAt.trim() !== "") {
		return paidAt;
	}

	console.warn(
		"[PayHQ] /api/payfirmaSale returned success without a valid paidAt; using client timestamp as fallback.",
	);
	return new Date().toISOString();
};

const PAYFIRMA_FIELD_HEIGHT = "56px";
const PAYFIRMA_FIELD_FONT_SIZE = "14px";
const COUNTRY_IDS_BY_ISO_CODE: Record<string, number[]> = {
	CA: [0, 40],
};

function getActivePayfirmaFieldMetrics(): PayfirmaFieldMetrics {
	return {height: PAYFIRMA_FIELD_HEIGHT, fontSize: PAYFIRMA_FIELD_FONT_SIZE};
}

function createPayfirmaInputStyle({
	height,
	fontSize,
}: PayfirmaFieldMetrics): PayfirmaInputStyle {
	return {
		height: "100%",
		width: "100%",
		border: "0",
		margin: "0",
		"box-sizing": "border-box",
		"text-align": "left",
		"line-height": height,
		"font-size": fontSize,
		background: "transparent",
	};
}

function countryCodeFromAddress(
	address: CustomerAddress | null | undefined,
): string {
	const vwCountryCode = address?.vwCountry?.code;
	if (vwCountryCode) {
		return vwCountryCode.toUpperCase();
	}

	const countryId = address?.country_id;
	if (countryId != null) {
		const matchingCountryCode = Object.entries(COUNTRY_IDS_BY_ISO_CODE).find(
			([, countryIds]) => countryIds.includes(countryId),
		)?.[0];

		if (matchingCountryCode) {
			return matchingCountryCode;
		}
	}

	return "";
}

function findProvinceOption(
	province: string,
	countryCode: string,
): IState | undefined {
	if (!province || !countryCode) {
		return undefined;
	}

	const normalizedProvince = province.toLowerCase();
	return State.getStatesOfCountry(countryCode).find(
		(option) =>
			option.name.toLowerCase() === normalizedProvince ||
			option.isoCode.toLowerCase() === normalizedProvince,
	);
}

function normalizeProvinceValue(province: string, countryCode: string): string {
	return findProvinceOption(province, countryCode)?.name ?? province;
}

function provinceCodeFromValue(province: string, countryCode: string): string {
	return findProvinceOption(province, countryCode)?.isoCode ?? province;
}

function getPaymentAddressDefaults(
	order?: ICheckoutData["order"],
): PaymentAddressFields {
	const firstAddress = order?.customer?.addresses?.[0];
	const country = countryCodeFromAddress(firstAddress);
	const rawProvince = firstAddress?.state ?? "";

	return {
		address1: firstAddress?.address_line_1 ?? "",
		address2: firstAddress?.address_line_2 ?? "",
		city: firstAddress?.city ?? "",
		country,
		postalCode: firstAddress?.zip ?? "",
		province: normalizeProvinceValue(rawProvince, country),
	};
}

const payfirmaFieldContainerSelector =
	"& #defaultCardNumber_container, & #defaultCardExpiry_container, & #defaultCardCvv_container";

const payfirmaFieldIframeSelector =
	"#defaultCardNumber_container iframe, #defaultCardExpiry_container iframe, #defaultCardCvv_container iframe";

const textFieldSx = {
	"& .MuiOutlinedInput-root": {
		minHeight: PAYFIRMA_FIELD_HEIGHT,
		borderRadius: 1,
		backgroundColor: "background.paper",
	},
};

const payfirmaContainerSx = (theme: Theme) => ({
	display: "grid",
	gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"},
	gap: 2,
	"& #defaultCardNumber_container": {
		gridColumn: "1 / -1",
	},
	[payfirmaFieldContainerSelector]: {
		width: "100%",
		height: `${PAYFIRMA_FIELD_HEIGHT} !important`,
		minHeight: `${PAYFIRMA_FIELD_HEIGHT} !important`,
		border: "1px solid rgba(0, 0, 0, 0.23) !important",
		borderRadius: "4px !important",
		boxSizing: "border-box !important",
		boxShadow: "none !important",
		transition: "border-color 0.2s, box-shadow 0.2s",
		"&:hover, &:focus": {
			borderColor: "#1976d2 !important",
		},
		"&:focus-within": {
			border: `2px solid ${theme.palette.primary.main} !important`,
		},
	},
});

function suppressPayfirmaIframeScrollbars(root: ParentNode = document) {
	root
		.querySelectorAll<HTMLIFrameElement>(payfirmaFieldIframeSelector)
		.forEach((iframe) => {
			iframe.setAttribute("scrolling", "no");
			iframe.style.display = "block";
			iframe.style.width = "100%";
			iframe.style.height = "100%";
			iframe.style.maxHeight = PAYFIRMA_FIELD_HEIGHT;
			iframe.style.border = "0";
			iframe.style.overflow = "hidden";
		});
}

const createDefaultPaymentInstance: CreatePaymentInstance = (
	key,
	containerId,
	options,
) =>
	new PayfirmaIframeTransaction(key, containerId, options) as PayfirmaPayment;

const PayHQ = forwardRef<PayHQHandle, PayHQProps>(function PayHQ(
	{
		order: propOrder,
		items: propItems,
		total: propTotal,
		tip,
		onPaymentFailed,
		createPaymentInstance = createDefaultPaymentInstance,
	},
	ref,
) {
	const {payfirmaInfo} = useCheckoutConfig();
	const apiKey = payfirmaInfo?.token ?? "";
	const PAYFIRMA_ENVIRONMENT = payfirmaInfo?.environment ?? "LIVE";

	const paymentContainerId = "easypay-container";
	const appState = useAppSelector((state) => state.app);
	const order = propOrder || appState.order;
	const items = propItems || appState.items;
	const total = propTotal || appState.total;

	const hasInitialized = useRef(false);
	const prevIsPaid = useRef<boolean>(false);
	const submitInFlightRef = useRef(false);
	const paymentApprovedRef = useRef(false);
	const requiredPaymentFieldRefs = useRef<
		Partial<Record<RequiredPaymentField, RequiredPaymentFieldElement | null>>
	>({});
	const [payment, setPayment] = useState<PayfirmaPayment | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [firstName, setFirstName] = useState(
		order?.customer?.first_name ?? "",
	);
	const [lastName, setLastName] = useState(order?.customer?.last_name ?? "");
	const [email, setEmail] = useState(order?.customer?.email ?? "");
	const initialAddressFields = getPaymentAddressDefaults(order);
	const [address1, setAddress1] = useState(initialAddressFields.address1);
	const [address2, setAddress2] = useState(initialAddressFields.address2);
	const [city, setCity] = useState(initialAddressFields.city);
	const [country, setCountry] = useState(initialAddressFields.country);
	const [postalCode, setPostalCode] = useState(initialAddressFields.postalCode);
	const [province, setProvince] = useState(initialAddressFields.province);
	const [requiredPaymentFieldErrors, setRequiredPaymentFieldErrors] =
		useState<RequiredPaymentFieldErrors>({});
	const countryOptions = useMemo(
		() =>
			Country.getAllCountries()
				.filter(
					(countryOption) =>
						State.getStatesOfCountry(countryOption.isoCode).length > 0,
				)
				.sort((a, b) => a.name.localeCompare(b.name)),
		[],
	);
	const provinceOptions = useMemo(
		() => (country ? State.getStatesOfCountry(country) : []),
		[country],
	);
	useEffect(() => {
		const addressDefaults = getPaymentAddressDefaults(order);
		setFirstName(order?.customer?.first_name ?? "");
		setLastName(order?.customer?.last_name ?? "");
		setEmail(order?.customer?.email ?? "");
		setAddress1(addressDefaults.address1);
		setAddress2(addressDefaults.address2);
		setCity(addressDefaults.city);
		setCountry(addressDefaults.country);
		setPostalCode(addressDefaults.postalCode);
		setProvince(addressDefaults.province);
		setRequiredPaymentFieldErrors({});
	}, [
		order,
		order?.customer?.first_name,
		order?.customer?.last_name,
		order?.customer?.email,
		order?.customer?.addresses,
	]);

	useEffect(() => {
		const isPaid = Boolean(order?.paid_at);
		if (!prevIsPaid.current && isPaid) {
			document
				.querySelector<HTMLElement>(".bdl-payment-form")
				?.scrollTo({top: 0, behavior: "smooth"});
		}
		prevIsPaid.current = isPaid;
	}, [order?.paid_at]);

	useEffect(() => {
		if (order?.paid_at || !apiKey || hasInitialized.current) {
			return;
		}

		hasInitialized.current = true;
		const payfirmaFieldMetrics = getActivePayfirmaFieldMetrics();
		const paymentInstance = createPaymentInstance(apiKey, paymentContainerId, {
			// environment: PAYFIRMA_ENVIRONMENT,
			style: {
				input: createPayfirmaInputStyle(payfirmaFieldMetrics),
			},
		}) as PayfirmaPayment;
		setPayment(paymentInstance);

		const paymentContainer = document.getElementById(paymentContainerId);
		suppressPayfirmaIframeScrollbars(paymentContainer ?? document);

		if (!paymentContainer) {
			return;
		}

		const observer = new MutationObserver(() => {
			suppressPayfirmaIframeScrollbars(paymentContainer);
		});

		observer.observe(paymentContainer, {childList: true, subtree: true});

		return () => {
			observer.disconnect();
		};
	}, [createPaymentInstance, apiKey, PAYFIRMA_ENVIRONMENT, paymentContainerId]);

	const setRequiredPaymentFieldRef = useCallback(
		(field: RequiredPaymentField) =>
			(element: RequiredPaymentFieldElement | null) => {
				requiredPaymentFieldRefs.current[field] = element;
			},
		[],
	);

	const focusFirstRequiredPaymentFieldError = useCallback(
		(fieldErrors: RequiredPaymentFieldErrors) => {
			const firstErrorField = requiredPaymentFieldOrder.find((field) =>
				Boolean(fieldErrors[field]),
			);

			if (!firstErrorField) {
				return;
			}

			const fieldElement = requiredPaymentFieldRefs.current[firstErrorField];
			fieldElement?.scrollIntoView?.({behavior: "smooth", block: "center"});
			fieldElement?.focus();
		},
		[],
	);

	const clearRequiredPaymentFieldError = useCallback(
		(field: RequiredPaymentField, value: string) => {
			if (!value.trim()) {
				return;
			}

			setRequiredPaymentFieldErrors((currentErrors) => {
				if (!currentErrors[field]) {
					return currentErrors;
				}

				const remainingErrors = {...currentErrors};
				delete remainingErrors[field];
				return remainingErrors;
			});
		},
		[],
	);

	const submitPayment = useCallback(async (): Promise<{paidAt: string}> => {
		if (paymentApprovedRef.current || order?.paid_at) {
			throw new Error("Payment has already been approved.");
		}

		if (!payment) {
			const message = "Payment module is still loading. Please try again.";
			onPaymentFailed(message);
			throw new Error(message);
		}

		if (submitInFlightRef.current || isSubmitting) {
			throw new Error("Payment is already being processed.");
		}

		let checkoutData;
		try {
			checkoutData = getCheckoutData();
		} catch (error) {
			const message =
				"Unable to start payment because checkout session data is missing. Please refresh and try again.";
			onPaymentFailed(message);
			throw new Error(message);
		}

		if (!checkoutData?.order || !checkoutData.total) {
			const message =
				"Unable to start payment because checkout session data is missing. Please refresh and try again.";
			onPaymentFailed(message);
			throw new Error(message);
		}

		const trimmedFirstName = firstName.trim();
		const trimmedLastName = lastName.trim();
		const trimmedEmail = email.trim();
		const trimmedAddress1 = address1.trim();
		const trimmedAddress2 = address2.trim();
		const trimmedCity = city.trim();
		const trimmedCountry = country.trim();
		const trimmedPostalCode = postalCode.trim();
		const trimmedProvince = province.trim();
		const paymentFieldErrors: RequiredPaymentFieldErrors = {};

		if (!trimmedFirstName) {
			paymentFieldErrors.firstName =
				requiredPaymentFieldErrorMessages.firstName;
		}
		if (!trimmedLastName) {
			paymentFieldErrors.lastName = requiredPaymentFieldErrorMessages.lastName;
		}
		if (!trimmedEmail) {
			paymentFieldErrors.email = requiredPaymentFieldErrorMessages.email;
		}
		if (!trimmedAddress1) {
			paymentFieldErrors.address1 = requiredPaymentFieldErrorMessages.address1;
		}
		if (!trimmedCity) {
			paymentFieldErrors.city = requiredPaymentFieldErrorMessages.city;
		}
		if (!trimmedCountry) {
			paymentFieldErrors.country = requiredPaymentFieldErrorMessages.country;
		}
		if (!trimmedPostalCode) {
			paymentFieldErrors.postalCode =
				requiredPaymentFieldErrorMessages.postalCode;
		}
		if (!trimmedProvince) {
			paymentFieldErrors.province =
				requiredPaymentFieldErrorMessages.province;
		}

		if (Object.keys(paymentFieldErrors).length > 0) {
			setRequiredPaymentFieldErrors(paymentFieldErrors);
			focusFirstRequiredPaymentFieldError(paymentFieldErrors);
			throw new PaymentValidationError("Required payment fields are missing.");
		}

		const paymentProvinceCode = provinceCodeFromValue(
			trimmedProvince,
			trimmedCountry,
		);

		setRequiredPaymentFieldErrors({});
		submitInFlightRef.current = true;
		setIsSubmitting(true);
		setSuccessMessage(null);

		try {
			const tokenResponse = await payment.getPaymentToken();
			const paymentToken = tokenResponse?.payment_token;

			if (!paymentToken) {
				throw new Error("Missing payment token");
			}

			let finalOrder = checkoutData.order;
			let finalTotal = checkoutData.total;
			const finalItems = checkoutData.items ?? items;

			if (finalOrder && finalTotal) {
				const tippedSession = applyCreditCardTipToSession(
					{order: finalOrder, total: finalTotal},
					tip,
				);
				finalOrder = tippedSession.order;
				finalTotal = tippedSession.total;
			}

			const response = await fetch("/api/payfirmaSale", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({
					orderId: finalOrder?.id,
					firstName: trimmedFirstName,
					lastName: trimmedLastName,
					email: trimmedEmail,
					address1: trimmedAddress1,
					address2: trimmedAddress2,
					city: trimmedCity,
					country: trimmedCountry,
					postalCode: trimmedPostalCode,
					province: paymentProvinceCode,
					paymentToken,
					order: finalOrder,
					items: finalItems,
					total: finalTotal,
				}),
			});

			if (!response.ok) {
				let message =
					"Payment could not be completed. Please try again or contact the store.";
				try {
					const errorData = await response.json();
					if (typeof errorData.message === "string")
						message = errorData.message;
				} catch (parseError) {
					console.error("[PayHQ] Failed to parse error response body", parseError);
				}
				throw new Error(message);
			}

			const data = (await response.json()) as {
				success?: boolean;
				paidAt?: unknown;
				message?: string;
			};

			if (!data.success) {
				throw new Error(
					data.message || "Payment could not be completed. Please try again or contact the store.",
				);
			}

			paymentApprovedRef.current = true;
			setSuccessMessage("Payment approved.");

			const paidAtResult = resolvePaidAt(data.paidAt);

			return {paidAt: paidAtResult};
		} catch (error) {
			console.error(
				"[PayHQ] Payment failed",
				error instanceof Error ? error.message : String(error),
			);
			const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "the store";
			const finalErrorMessage =
				error instanceof Error
					? error.message
					: `Payment could not be completed. Please try again or contact the store at ${adminEmail}.`;

			onPaymentFailed(finalErrorMessage);
			throw error instanceof Error ? error : new Error(finalErrorMessage);
		} finally {
			submitInFlightRef.current = false;
			setIsSubmitting(false);
		}
	}, [
		payment,
		isSubmitting,
		order,
		items,
		total,
		tip,
		firstName,
		lastName,
		email,
		address1,
		address2,
		city,
		country,
		postalCode,
		province,
		onPaymentFailed,
		focusFirstRequiredPaymentFieldError,
	]);

	useImperativeHandle(
		ref,
		() => ({
			submitPayment,
		}),
		[submitPayment],
	);

	if (!apiKey) {
		return (
			<Alert severity="error">
				<Typography>
					An error occurred while initializing the payment module. <br />
					Please contact{" "}
					<a href={`mailto:${process.env.NEXT_PUBLIC_ADMIN_EMAIL}`}>
						{process.env.NEXT_PUBLIC_ADMIN_EMAIL}
					</a>
				</Typography>
			</Alert>
		);
	}

	return (
		<Box
			component="section"
			sx={{
				width: "100%",
				display: "flex",
				justifyContent: "center",
				my: 3,
			}}
		>
			<Paper
				elevation={3}
				sx={{
					width: "100%",
					maxWidth: 800,
					p: {xs: 2.5, sm: 4},
					borderRadius: 3,
					border: "1px solid",
					borderColor: "divider",
					backgroundColor: "background.paper",
				}}
			>
				{order?.paid_at ? (
					<Alert severity="info">
						<Typography>
							Your payment was approved. Please wait while we process your order.
						</Typography>
					</Alert>
				) : (
					<Stack spacing={3}>
						<Box>
							<Typography component="h2" variant="h6" sx={{fontWeight: 700}}>
								Payment details
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Enter the cardholder name and card information to complete
								payment.
							</Typography>
						</Box>

						<Grid container spacing={2}>
							<Grid size={{xs: 12, sm: 6}}>
								<TextField
									required
									fullWidth
									label="First Name"
									placeholder="First Name"
									autoComplete="given-name"
									inputRef={setRequiredPaymentFieldRef("firstName")}
									value={firstName}
									onChange={(event) => {
										const {value} = event.target;
										setFirstName(value);
										clearRequiredPaymentFieldError("firstName", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.firstName)}
									helperText={requiredPaymentFieldErrors.firstName ?? ""}
									sx={textFieldSx}
									slotProps={{htmlInput: {className: "input-field"}}}
								/>
							</Grid>
							<Grid size={{xs: 12, sm: 6}}>
								<TextField
									fullWidth
									required
									label="Last Name"
									placeholder="Last Name"
									autoComplete="family-name"
									inputRef={setRequiredPaymentFieldRef("lastName")}
									value={lastName}
									onChange={(event) => {
										const {value} = event.target;
										setLastName(value);
										clearRequiredPaymentFieldError("lastName", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.lastName)}
									helperText={requiredPaymentFieldErrors.lastName ?? ""}
									sx={textFieldSx}
									slotProps={{htmlInput: {className: "input-field"}}}
								/>
							</Grid>
							<Grid size={12}>
								<TextField
									fullWidth
									required
									type="email"
									label="Email"
									placeholder="Email"
									autoComplete="email"
									inputRef={setRequiredPaymentFieldRef("email")}
									value={email}
									onChange={(event) => {
										const {value} = event.target;
										setEmail(value);
										clearRequiredPaymentFieldError("email", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.email)}
									helperText={requiredPaymentFieldErrors.email ?? ""}
									sx={textFieldSx}
									slotProps={{htmlInput: {className: "input-field"}}}
								/>
							</Grid>
							<Grid size={12}>
								<TextField
									fullWidth
									required
									label="Address 1"
									placeholder="Address 1"
									autoComplete="address-line1"
									inputRef={setRequiredPaymentFieldRef("address1")}
									value={address1}
									onChange={(event) => {
										const {value} = event.target;
										setAddress1(value);
										clearRequiredPaymentFieldError("address1", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.address1)}
									helperText={requiredPaymentFieldErrors.address1 ?? ""}
									sx={textFieldSx}
									slotProps={{htmlInput: {className: "input-field"}}}
								/>
							</Grid>
							<Grid size={12}>
								<TextField
									fullWidth
									label="Address 2"
									placeholder="Address 2"
									autoComplete="address-line2"
									value={address2}
									onChange={(event) => setAddress2(event.target.value)}
									sx={textFieldSx}
									slotProps={{htmlInput: {className: "input-field"}}}
								/>
							</Grid>
							<Grid size={{xs: 12, sm: 6}}>
								<TextField
									fullWidth
									required
									label="City"
									placeholder="City"
									autoComplete="address-level2"
									inputRef={setRequiredPaymentFieldRef("city")}
									value={city}
									onChange={(event) => {
										const {value} = event.target;
										setCity(value);
										clearRequiredPaymentFieldError("city", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.city)}
									helperText={requiredPaymentFieldErrors.city ?? ""}
									sx={textFieldSx}
									slotProps={{htmlInput: {className: "input-field"}}}
								/>
							</Grid>
							<Grid size={{xs: 12, sm: 6}}>
								<TextField
									fullWidth
									required
									select
									label="Select Country"
									inputRef={setRequiredPaymentFieldRef("country")}
									value={country}
									onChange={(event) => {
										const {value} = event.target;
										const nextProvinceOptions = State.getStatesOfCountry(value);
										setCountry(value);
										setProvince((currentProvince) =>
											nextProvinceOptions.some(
												(option) => option.name === currentProvince,
											)
												? currentProvince
												: "",
										);
										clearRequiredPaymentFieldError("country", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.country)}
									helperText={requiredPaymentFieldErrors.country ?? ""}
									sx={textFieldSx}
									SelectProps={{native: true}}
								>
									<option value="">Select Country</option>
									{countryOptions.map((countryOption: ICountry) => (
										<option key={countryOption.isoCode} value={countryOption.isoCode}>
											{countryOption.name}
										</option>
									))}
								</TextField>
							</Grid>
							<Grid size={{xs: 12, sm: 6}}>
								<TextField
									fullWidth
									required
									label="Postal Code"
									placeholder="Postal Code"
									autoComplete="postal-code"
									inputRef={setRequiredPaymentFieldRef("postalCode")}
									value={postalCode}
									onChange={(event) => {
										const {value} = event.target;
										setPostalCode(value);
										clearRequiredPaymentFieldError("postalCode", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.postalCode)}
									helperText={requiredPaymentFieldErrors.postalCode ?? ""}
									sx={textFieldSx}
									slotProps={{htmlInput: {className: "input-field"}}}
								/>
							</Grid>
							<Grid size={{xs: 12, sm: 6}}>
								<TextField
									fullWidth
									required
									select
									label="Province/State"
									inputRef={setRequiredPaymentFieldRef("province")}
									value={province}
									onChange={(event) => {
										const {value} = event.target;
										setProvince(value);
										clearRequiredPaymentFieldError("province", value);
									}}
									error={Boolean(requiredPaymentFieldErrors.province)}
									helperText={requiredPaymentFieldErrors.province ?? ""}
									sx={textFieldSx}
									SelectProps={{native: true}}
								>
									<option value="">Province/State</option>
									{provinceOptions.map((provinceOption: IState) => (
										<option key={provinceOption.isoCode} value={provinceOption.name}>
											{provinceOption.name}
										</option>
									))}
								</TextField>
							</Grid>
							<Grid size={12}>
								<Box id={paymentContainerId} sx={payfirmaContainerSx} />
							</Grid>
						</Grid>

						{isSubmitting && (
							<Box sx={{textAlign: "center"}} aria-live="polite">
								<CircularProgress size={32} />
							</Box>
						)}

						{successMessage && (
							<Alert severity="success">{successMessage}</Alert>
						)}
					</Stack>
				)}
			</Paper>
		</Box>
	);
});

export default PayHQ;
