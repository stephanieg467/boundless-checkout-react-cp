export type DeliveryQuoteRequest = {
	street: string;
	unit?: string;
	city: string;
	province: string;
	postalCode: string;
};

export type DeliveryQuoteResponse =
	| {status: "ok"; fee: string; zoneLabel: string; distanceKm: number}
	| {status: "needs_confirmation"; address: DeliveryQuoteRequest}
	| {status: "out_of_range"; maxKm: number}
	| {status: "unverifiable"}
	| {status: "unavailable"};

export type StoredDeliveryQuote = {
	fee: string;
	zoneLabel: string;
	quotedAt: number;
};

export const CHECKOUT_WINDOW_MS = 8 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isValidFee(value: unknown): value is string {
	return typeof value === "string" && /^\d+\.\d{2}$/.test(value) && Number.isFinite(Number(value));
}

function isQuoteAddress(value: unknown): value is DeliveryQuoteRequest {
	return isRecord(value)
		&& [value.street, value.city, value.province, value.postalCode].every(isNonEmptyString)
		&& (value.unit === undefined || typeof value.unit === "string");
}

function isPricedQuote(value: Record<string, unknown>): boolean {
	return isValidFee(value.fee) && isNonEmptyString(value.zoneLabel) && isNonNegativeNumber(value.distanceKm);
}

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

function isStoredDeliveryQuote(quote: unknown): quote is StoredDeliveryQuote {
	return isRecord(quote) && isValidFee(quote.fee) && isNonEmptyString(quote.zoneLabel)
		&& isNonNegativeNumber(quote.quotedAt);
}

export function isDeliveryQuoteFresh(quote: unknown, now = Date.now()): quote is StoredDeliveryQuote {
	if (!isStoredDeliveryQuote(quote) || !Number.isFinite(now)) return false;

	const age = now - quote.quotedAt;
	return age >= 0 && age < CHECKOUT_WINDOW_MS;
}
