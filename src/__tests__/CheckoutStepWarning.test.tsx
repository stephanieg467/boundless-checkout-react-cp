import React from "react";
import {render, screen} from "@testing-library/react";
import {TCheckoutStep} from "../types/common";

let mockState: any = {};

jest.mock("../hooks/redux", () => ({
	useAppSelector: (selector: any) => selector(mockState),
}));

const renderCheckoutStepWarning = (step: TCheckoutStep) => {
	const CheckoutStepWarning = require("../components/CheckoutStepWarning").default;
	return render(<CheckoutStepWarning step={step} />);
};

describe("CheckoutStepWarning", () => {
	it("renders no alert when stepWarning is null", () => {
		mockState = {app: {stepWarning: null}};

		renderCheckoutStepWarning(TCheckoutStep.contactInfo);

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("renders no alert when stepWarning is for a different step", () => {
		mockState = {
			app: {
				stepWarning: {
					step: TCheckoutStep.shippingAddress,
					message: "Please complete your delivery method before continuing.",
				},
			},
		};

		renderCheckoutStepWarning(TCheckoutStep.contactInfo);

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("renders the warning message when stepWarning matches the component step", () => {
		mockState = {
			app: {
				stepWarning: {
					step: TCheckoutStep.contactInfo,
					message: "Please complete your contact information before continuing.",
				},
			},
		};

		renderCheckoutStepWarning(TCheckoutStep.contactInfo);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Please complete your contact information before continuing.",
		);
	});
});
