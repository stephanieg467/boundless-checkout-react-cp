"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Grid,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import PaymentIcon from "@mui/icons-material/Payment";
import PayfirmaIframeTransaction from "merrco-payfirma-simple-pay-module";
import { ICheckoutData } from "../../../types/Order";
import { useAppSelector } from "../../../hooks/redux";
import { useCheckoutConfig } from "../../../contexts/CheckoutConfigContext";
import { applyCreditCardTipToSession } from "../../../lib/paymentOutcome";

type PaymentTokenResponse = {
	payment_token: string;
};

type PayfirmaPayment = {
	getPaymentToken: () => Promise<PaymentTokenResponse>;
};

type PayfirmaInputStyle = Record<string, string>;

type PayfirmaOptions = {
	environment: string;
	style?: {
		input: PayfirmaInputStyle;
	};
};

type PayHQProps = {
	order?: ICheckoutData["order"];
	items?: ICheckoutData["items"];
	total?: ICheckoutData["total"];
	tip?: string;
	onPaymentApproved: (paidAt: string) => void;
	onPaymentFailed: (errorMessage: string) => void;
	createPaymentInstance?: CreatePaymentInstance;
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

type RequiredContactField = "firstName" | "lastName" | "email";

type RequiredContactFieldErrors = Partial<Record<RequiredContactField, string>>;

const requiredContactFieldErrorMessages: Record<RequiredContactField, string> = {
	firstName: "First name is required",
	lastName: "Last name is required",
	email: "Email is required",
};

const PAYFIRMA_FIELD_HEIGHT = "56px";
const PAYFIRMA_FIELD_FONT_SIZE = "14px";

function getActivePayfirmaFieldMetrics(): PayfirmaFieldMetrics {
	return { height: PAYFIRMA_FIELD_HEIGHT, fontSize: PAYFIRMA_FIELD_FONT_SIZE };
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
	gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
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

function PayHQ({
	order: propOrder,
	items: propItems,
	total: propTotal,
	tip,
	onPaymentApproved,
	onPaymentFailed,
	createPaymentInstance = createDefaultPaymentInstance,
}: PayHQProps) {
	const { payfirmaInfo } = useCheckoutConfig();
	const apiKey = payfirmaInfo?.token ?? "";
	const PAYFIRMA_ENVIRONMENT = payfirmaInfo?.environment ?? "LIVE";

	const paymentContainerId = "easypay-container";
	const appState = useAppSelector((state) => state.app);
	const order = propOrder || appState.order;
	const items = propItems || appState.items;
	const total = propTotal || appState.total;

	const hasInitialized = useRef(false);
	const prevIsPaid = useRef<boolean>(false);
	const [payment, setPayment] = useState<PayfirmaPayment | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [firstName, setFirstName] = useState(
		order?.customer?.first_name ?? "",
	);
	const [lastName, setLastName] = useState(order?.customer?.last_name ?? "");
	const [email, setEmail] = useState(order?.customer?.email ?? "");
	const [requiredContactFieldErrors, setRequiredContactFieldErrors] =
		useState<RequiredContactFieldErrors>({});

	useEffect(() => {
		setFirstName(order?.customer?.first_name ?? "");
		setLastName(order?.customer?.last_name ?? "");
		setEmail(order?.customer?.email ?? "");
		setRequiredContactFieldErrors({});
	}, [
		order?.customer?.first_name,
		order?.customer?.last_name,
		order?.customer?.email,
	]);

	useEffect(() => {
		const isPaid = Boolean(order?.paid_at);
		if (!prevIsPaid.current && isPaid) {
			document
				.querySelector<HTMLElement>(".bdl-payment-form")
				?.scrollTo({ top: 0, behavior: "smooth" });
		}
		prevIsPaid.current = isPaid;
	}, [order?.paid_at]);

	useEffect(() => {
		console.log("[PayHQ] Initializing payment module")
		if (order?.paid_at || !apiKey || hasInitialized.current) {
			return;
		}

		hasInitialized.current = true;
		const payfirmaFieldMetrics = getActivePayfirmaFieldMetrics();
		const paymentInstance = createPaymentInstance(apiKey, paymentContainerId, {
			environment: PAYFIRMA_ENVIRONMENT,
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

		observer.observe(paymentContainer, { childList: true, subtree: true });

		return () => {
			observer.disconnect();
		};
	}, [createPaymentInstance, apiKey, PAYFIRMA_ENVIRONMENT, paymentContainerId]);

	const clearRequiredContactFieldError = useCallback(
		(field: RequiredContactField, value: string) => {
			if (!value.trim()) {
				return;
			}

			setRequiredContactFieldErrors((currentErrors) => {
				if (!currentErrors[field]) {
					return currentErrors;
				}

				const remainingErrors = { ...currentErrors };
				delete remainingErrors[field];
				return remainingErrors;
			});
		},
		[],
	);

	const handlePaymentClick = useCallback(async () => {
		if (!payment || isSubmitting) return;

		const trimmedFirstName = firstName.trim();
		const trimmedLastName = lastName.trim();
		const trimmedEmail = email.trim();
		const contactFieldErrors: RequiredContactFieldErrors = {};

		if (!trimmedFirstName) {
			contactFieldErrors.firstName =
				requiredContactFieldErrorMessages.firstName;
		}
		if (!trimmedLastName) {
			contactFieldErrors.lastName = requiredContactFieldErrorMessages.lastName;
		}
		if (!trimmedEmail) {
			contactFieldErrors.email = requiredContactFieldErrorMessages.email;
		}

		if (Object.keys(contactFieldErrors).length > 0) {
			setRequiredContactFieldErrors(contactFieldErrors);
			return;
		}

		setRequiredContactFieldErrors({});
		setIsSubmitting(true);
		setSuccessMessage(null);

		try {
			const tokenResponse = await payment.getPaymentToken();
			const paymentToken = tokenResponse.payment_token;

			if (!paymentToken) {
				throw new Error("Missing payment token");
			}

			let finalOrder = order;
			let finalTotal = total;

			if (finalOrder && finalTotal) {
				const tippedSession = applyCreditCardTipToSession(
					{ order: finalOrder, total: finalTotal },
					tip,
				);
				finalOrder = tippedSession.order;
				finalTotal = tippedSession.total;
			}

			const response = await fetch("/api/payfirmaSale", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orderId: finalOrder?.id,
					firstName: trimmedFirstName,
					lastName: trimmedLastName,
					email: trimmedEmail,
					paymentToken,
					order: finalOrder,
					items,
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
				} catch {
					// Keep generic message.
				}
				throw new Error(message);
			}

			const data = (await response.json()) as {
				success?: boolean;
				paidAt?: string;
			};

			if (!data.success) {
				throw new Error(
					"Payment could not be completed. Please try again or contact the store.",
				);
			}

			const paidAt = data.paidAt ?? new Date().toISOString();
			setSuccessMessage("Payment approved.");
			onPaymentApproved(paidAt);
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
		} finally {
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
		onPaymentApproved,
		onPaymentFailed,
	]);

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
					p: { xs: 2.5, sm: 4 },
					borderRadius: 3,
					border: "1px solid",
					borderColor: "divider",
					backgroundColor: "background.paper",
				}}
			>
				{order?.paid_at ? (
					<Alert severity="info">
						<Typography>
							This order has been paid; proceed to order completion.
						</Typography>
					</Alert>
				) : (
					<Stack spacing={3}>
						<Box>
							<Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
								Payment details
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Enter the cardholder name and card information to complete
								payment.
							</Typography>
						</Box>

						<Grid container spacing={2}>
							<Grid size={{ xs: 12, sm: 6 }}>
								<TextField
									required
									fullWidth
									label="First Name"
									placeholder="First Name"
									autoComplete="given-name"
									value={firstName}
									onChange={(event) => {
										const { value } = event.target;
										setFirstName(value);
										clearRequiredContactFieldError("firstName", value);
									}}
									error={Boolean(requiredContactFieldErrors.firstName)}
									helperText={requiredContactFieldErrors.firstName ?? ""}
									sx={textFieldSx}
									slotProps={{ htmlInput: { className: "input-field" } }}
								/>
							</Grid>
							<Grid size={{ xs: 12, sm: 6 }}>
								<TextField
									fullWidth
									required
									label="Last Name"
									placeholder="Last Name"
									autoComplete="family-name"
									value={lastName}
									onChange={(event) => {
										const { value } = event.target;
										setLastName(value);
										clearRequiredContactFieldError("lastName", value);
									}}
									error={Boolean(requiredContactFieldErrors.lastName)}
									helperText={requiredContactFieldErrors.lastName ?? ""}
									sx={textFieldSx}
									slotProps={{ htmlInput: { className: "input-field" } }}
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
									value={email}
									onChange={(event) => {
										const { value } = event.target;
										setEmail(value);
										clearRequiredContactFieldError("email", value);
									}}
									error={Boolean(requiredContactFieldErrors.email)}
									helperText={requiredContactFieldErrors.email ?? ""}
									sx={textFieldSx}
									slotProps={{ htmlInput: { className: "input-field" } }}
								/>
							</Grid>
							<Grid size={12}>
								<Box id={paymentContainerId} sx={payfirmaContainerSx} />
							</Grid>
						</Grid>

						<Button
							id="payButton"
							variant="contained"
							color="success"
							startIcon={<PaymentIcon />}
							size="large"
							fullWidth
							onClick={handlePaymentClick}
							disabled={successMessage !== null || !payment || isSubmitting}
							sx={{
								py: 1.5,
								borderRadius: 2,
								fontWeight: 700,
								textTransform: "none",
								boxShadow: 2,
							}}
						>
							{isSubmitting ? "Processing payment..." : "Pay"}
						</Button>

						{isSubmitting && (
							<Box sx={{ textAlign: "center" }} aria-live="polite">
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
}

export default PayHQ;
