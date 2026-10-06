import React from "react";
import {render, screen} from "@testing-library/react";
import {getDeliveryTimeOptionText, renderDeliveryTimeOptions} from "./helpers";
import type {DeliveryTimeOption} from "../../lib/deliveryTimes";

(globalThis as any).React = React;

describe("getDeliveryTimeOptionText", () => {
	it("keeps fee-free slots free even in a paid quote zone", () => {
		const option: DeliveryTimeOption = {
			label: "2pm - 3pm",
			applyDeliveryFee: false,
		};

		expect(getDeliveryTimeOptionText(option, "6.00")).toBe("2pm - 3pm — Free delivery");
	});

	it.each([
		{label: "1pm - 2pm", applyDeliveryFee: true},
		{label: "1pm - 2pm"},
	])("uses the quoted fee for paid slots (applyDeliveryFee: $applyDeliveryFee)", (option) => {
		expect(getDeliveryTimeOptionText(option as DeliveryTimeOption, "6.00")).toBe(
			"1pm - 2pm — $6.00 delivery fee",
		);
	});

	it("does not show a paid-slot price before the address is quoted", () => {
		expect(getDeliveryTimeOptionText({label: "1pm - 2pm", applyDeliveryFee: true})).toBe("1pm - 2pm");
	});
});

describe("renderDeliveryTimeOptions", () => {
	const times: DeliveryTimeOption[] = [
		{label: "1pm - 2pm", applyDeliveryFee: true},
		{label: "2pm - 3pm", applyDeliveryFee: false},
	];

	it("shows the confirmed fee while keeping the bare label as the option value", () => {
		render(
			<select aria-label="Delivery time">
				{renderDeliveryTimeOptions(times, false, false, "6.00")}
			</select>,
		);

		const paidOption = screen.getByRole("option", {
			name: "1pm - 2pm — $6.00 delivery fee",
		});
		const freeOption = screen.getByRole("option", {
			name: "2pm - 3pm — Free delivery",
		});

		expect(paidOption).toHaveValue("1pm - 2pm");
		expect(freeOption).toHaveValue("2pm - 3pm");
	});
});
