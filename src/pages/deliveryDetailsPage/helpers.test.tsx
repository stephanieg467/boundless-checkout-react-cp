import React from "react";
import {render, screen} from "@testing-library/react";
import {getDeliveryTimeOptionText, renderDeliveryTimeOptions} from "./helpers";
import {DELIVERY_COST} from "../../constants";
import type {DeliveryTimeOption} from "../../lib/deliveryTimes";

(globalThis as any).React = React;

describe("getDeliveryTimeOptionText", () => {
	it("appends free-delivery copy when applyDeliveryFee is false", () => {
		const option: DeliveryTimeOption = {
			label: "2pm - 3pm",
			applyDeliveryFee: false,
		};

		expect(getDeliveryTimeOptionText(option)).toBe("2pm - 3pm — Free delivery");
	});

	it("appends delivery-fee copy when applyDeliveryFee is true", () => {
		const option: DeliveryTimeOption = {
			label: "1pm - 2pm",
			applyDeliveryFee: true,
		};

		expect(getDeliveryTimeOptionText(option)).toBe(
			`1pm - 2pm — $${DELIVERY_COST} delivery fee`,
		);
	});

	it("treats a missing applyDeliveryFee as paid", () => {
		const option = {label: "1pm - 2pm"} as DeliveryTimeOption;

		expect(getDeliveryTimeOptionText(option)).toBe(
			`1pm - 2pm — $${DELIVERY_COST} delivery fee`,
		);
	});
});

describe("renderDeliveryTimeOptions", () => {
	const times: DeliveryTimeOption[] = [
		{label: "1pm - 2pm", applyDeliveryFee: true},
		{label: "2pm - 3pm", applyDeliveryFee: false},
	];

	it("shows annotated text while keeping the bare label as the option value", () => {
		render(
			<select aria-label="Delivery time">
				{renderDeliveryTimeOptions(times, false, false)}
			</select>,
		);

		const paidOption = screen.getByRole("option", {
			name: `1pm - 2pm — $${DELIVERY_COST} delivery fee`,
		});
		const freeOption = screen.getByRole("option", {
			name: "2pm - 3pm — Free delivery",
		});

		expect(paidOption).toHaveValue("1pm - 2pm");
		expect(freeOption).toHaveValue("2pm - 3pm");
	});
});
