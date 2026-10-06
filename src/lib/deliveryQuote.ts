/**
 * @typedef {Object} DeliveryQuoteRequest
 * @property {string} street Street address.
 * @property {string} [unit] Optional apartment or unit.
 * @property {string} city City name.
 * @property {string} province Province code.
 * @property {string} postalCode Postal code.
 */
export type DeliveryQuoteRequest = {
	street: string;
	unit?: string;
	city: string;
	province: string;
	postalCode: string;
};

/**
 * @typedef {Object} DeliveryQuoteResponse
 * @property {string} status Quote outcome; only ok enables Delivery.
 * @property {string} [fee] CAD amount for ok.
 * @property {string} [zoneLabel] Zone label for ok.
 * @property {number} [distanceKm] Display-only driving distance for ok.
 * @property {DeliveryQuoteRequest} [address] Corrected address for needs_confirmation.
 * @property {number} [maxKm] Maximum distance for out_of_range.
 */
export type DeliveryQuoteResponse =
	| {status: "ok"; fee: string; zoneLabel: string; distanceKm: number}
	| {status: "needs_confirmation"; address: DeliveryQuoteRequest}
	| {status: "out_of_range"; maxKm: number}
	| {status: "unverifiable"}
	| {status: "unavailable"};

/**
 * @typedef {Object} StoredDeliveryQuote
 * @property {string} fee Quoted CAD amount.
 * @property {string} zoneLabel Quoted zone label.
 * @property {number} quotedAt Quote time in epoch milliseconds.
 */
export type StoredDeliveryQuote = {
	fee: string;
	zoneLabel: string;
	quotedAt: number;
};

export const CHECKOUT_WINDOW_MS = 8 * 60 * 60 * 1000;

/** @param value Untrusted JSON value. @returns Whether it is an object. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param value Untrusted text. @returns Whether it has non-whitespace content. */
function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

/** @param value Untrusted amount or distance. @returns Whether it is finite and non-negative. */
function isNonNegativeNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** @param value Untrusted fee. @returns Whether it is a non-negative CAD amount with two decimals. */
export function isValidFee(value: unknown): value is string {
	return typeof value === "string" && /^\d+\.\d{2}$/.test(value) && Number.isFinite(Number(value));
}

/** @param value Untrusted corrected address. @returns Whether all request fields are valid. */
function isQuoteAddress(value: unknown): value is DeliveryQuoteRequest {
	return isRecord(value)
		&& [value.street, value.city, value.province, value.postalCode].every(isNonEmptyString)
		&& (value.unit === undefined || typeof value.unit === "string");
}

/** @param value Untrusted ok response object. @returns Whether it contains valid pricing and zone data. */
function isPricedQuote(value: Record<string, unknown>): boolean {
	return isValidFee(value.fee) && isNonEmptyString(value.zoneLabel) && isNonNegativeNumber(value.distanceKm);
}

/** @param value Untrusted response JSON. @returns Whether it matches a known quote outcome. */
function isQuoteResponse(value: unknown): value is DeliveryQuoteResponse {
	if (!isRecord(value)) return false;
	if (["unverifiable", "unavailable"].includes(value.status as string)) return true;

	switch (value.status) {
		case "ok":
			return isPricedQuote(value);
		case "needs_confirmation":
			return isQuoteAddress(value.address);
		case "out_of_range":
			return isNonNegativeNumber(value.maxKm);
		default:
			return false;
	}
}

/**
 * Requests a quote without allowing transport or malformed payload failures to become prices.
 * @param address Shipping address to quote.
 * @returns A validated quote outcome, or unavailable on any request/response failure.
 */
export async function requestDeliveryQuote(address: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> {
	try {
		const response = await fetch("/api/deliveryQuote", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify(address),
		});
		if (response.status !== 200) return {status: "unavailable"};

		const data: unknown = await response.json();
		return isQuoteResponse(data) ? data : {status: "unavailable"};
	} catch {
		return {status: "unavailable"};
	}
}

/** @param quote Untrusted persisted quote. @returns Whether it contains valid fee, zone and timestamp fields. */
function isStoredDeliveryQuote(quote: unknown): quote is StoredDeliveryQuote {
	return isRecord(quote) && isValidFee(quote.fee) && isNonEmptyString(quote.zoneLabel)
		&& isNonNegativeNumber(quote.quotedAt);
}

/**
 * @param quote Persisted quote, possibly absent or malformed in a restored checkout.
 * @param now Current time in epoch milliseconds.
 * @returns Whether the quote is valid and less than one Checkout Window old.
 */
export function isDeliveryQuoteFresh(quote: unknown, now = Date.now()): quote is StoredDeliveryQuote {
	if (!isStoredDeliveryQuote(quote) || !Number.isFinite(now)) return false;

	const age = now - quote.quotedAt;
	return age >= 0 && age < CHECKOUT_WINDOW_MS;
}
