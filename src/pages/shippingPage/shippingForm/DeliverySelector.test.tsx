import React from "react";
import {render, screen} from "@testing-library/react";
import {Formik} from "formik";
import DeliverySelector from "./DeliverySelector";
import {
	DELIVERY_COST,
	DELIVERY_ID,
	SELF_PICKUP_ID,
	SHIPPING_COST,
	SHIPPING_DELIVERY_ID,
} from "../../../constants";

(globalThis as any).React = React;

let mockState: any = {};

jest.mock("../../../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
}));

const deliveryOptions = [
	{
		delivery_id: SELF_PICKUP_ID,
		title: "Self Pickup",
		alias: "selfPickup",
		description: "In Store Pick Up",
	},
	{
		delivery_id: DELIVERY_ID,
		title: "Delivery",
		alias: "delivery",
		description: "Deliver order to your address",
	},
	{
		delivery_id: SHIPPING_DELIVERY_ID,
		title: "Shipping",
		alias: "shipping",
		description: "Ship order to your address",
	},
];

const renderDeliverySelector = ({
	itemsSubTotalPrice = "10.00",
	deliveryTimeOptions,
}: {
	itemsSubTotalPrice?: string;
	deliveryTimeOptions?: Array<{label: string; applyDeliveryFee?: boolean}>;
} = {}) => {
	mockState = {
		app: {
			total: {
				itemsSubTotal: {price: itemsSubTotalPrice},
			},
		},
	};

	const TestDeliverySelector = DeliverySelector as React.ComponentType<any>;

	return render(
		<Formik initialValues={{delivery_id: DELIVERY_ID}} onSubmit={jest.fn()}>
			<TestDeliverySelector
				options={{delivery: deliveryOptions}}
				deliveryTimeOptions={deliveryTimeOptions}
			/>
		</Formik>,
	);
};

describe("DeliverySelector fee copy", () => {
	const paidOrConditionalDeliveryFeeCopy = `Delivery fee: $${DELIVERY_COST} for certain delivery time slots`;

	it.each([
		{
			name: "delivery time options are still loading",
			deliveryTimeOptions: undefined,
		},
		{
			name: "loaded delivery time options are empty",
			deliveryTimeOptions: [],
		},
		{
			name: "available regular slots include an explicit paid slot",
			deliveryTimeOptions: [
				{label: "10am - 11am", applyDeliveryFee: false},
				{label: "11am - 12pm", applyDeliveryFee: true},
			],
		},
		{
			name: "available regular slots include a slot missing applyDeliveryFee, defaulting to paid",
			deliveryTimeOptions: [
				{label: "10am - 11am", applyDeliveryFee: false},
				{label: "11am - 12pm"},
			],
		},
	])(
		"shows conditional Delivery fee copy when $name",
		({deliveryTimeOptions}) => {
			renderDeliverySelector({deliveryTimeOptions});

			expect(
				screen.getByText(paidOrConditionalDeliveryFeeCopy),
			).toBeInTheDocument();
		},
	);

	it("shows fee-free Delivery copy when all available regular slots are fee-free", () => {
		renderDeliverySelector({
			deliveryTimeOptions: [
				{label: "10am - 11am", applyDeliveryFee: false},
				{label: "11am - 12pm", applyDeliveryFee: false},
			],
		});

		expect(
			screen.getByText(
				"Delivery fee: $0.00 for available delivery time slots",
			),
		).toBeInTheDocument();
	});

	it("does not show order-over-$100 free-shipping messaging for local Delivery", () => {
		renderDeliverySelector({
			itemsSubTotalPrice: "100.00",
			deliveryTimeOptions: [{label: "10am - 11am", applyDeliveryFee: true}],
		});

		expect(screen.queryByText(/FREE \(Order over \$100\)/)).not.toBeInTheDocument();
	});

	it.each([
		{
			name: "paid shipping below the threshold",
			itemsSubTotalPrice: "99.99",
			qualifiesForFreeShipping: false,
		},
		{
			name: "free shipping at the threshold",
			itemsSubTotalPrice: "100.00",
			qualifiesForFreeShipping: true,
		},
	])(
		"keeps Shipping copy based on qualifiesForFreeShipping: $name",
		({itemsSubTotalPrice, qualifiesForFreeShipping}) => {
			renderDeliverySelector({itemsSubTotalPrice});

			expect(
				screen.getByText(`Shipping fee: $${SHIPPING_COST}`),
			).toBeInTheDocument();
			if (qualifiesForFreeShipping) {
				expect(
					screen.getByText(/FREE SHIPPING \(Order over \$100\)/),
				).toBeInTheDocument();
			} else {
				expect(
					screen.queryByText(/FREE SHIPPING \(Order over \$100\)/),
				).not.toBeInTheDocument();
			}
		},
	);
});
