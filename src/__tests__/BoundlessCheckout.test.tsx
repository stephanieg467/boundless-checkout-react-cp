import {vi} from "vitest";
import React from "react";
import {render, screen} from "@testing-library/react";
import {setBasicProps, showCheckout} from "../redux/reducers/app";

vi.mock("../redux/store", () => ({
	store: {
		dispatch: vi.fn(),
		getState: () => ({app: {show: true}}),
		subscribe: vi.fn(() => vi.fn()),
	},
}));

vi.mock("react-redux", () => ({
	Provider: ({children}: {children: React.ReactNode}) => <>{children}</>,
	useSelector: vi.fn((selector: any) => selector({app: {show: true}})),
}));

vi.mock("../StepRenderer", async () => {
	const {default: Footer} = await vi.importActual<typeof import("../components/Footer")>("../components/Footer");

	return {default: () => <div data-testid="step-renderer"><Footer /></div>};
});

const mockQueryClientConstructor = vi.fn();

vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");

	return {
		...actual,
		QueryClient: vi.fn().mockImplementation(function (...args: ConstructorParameters<typeof actual.QueryClient>) {
			mockQueryClientConstructor(...args);

			return new actual.QueryClient(...args);
		}),
		QueryClientProvider: actual.QueryClientProvider,
	};
});

import BoundlessCheckout from "../BoundlessCheckout";

import {store} from "../redux/store";

const mockStore = vi.mocked(store);

const defaultProps = {
	onHide: vi.fn(),
	onThankYouPage: vi.fn(),
	payfirmaInfo: {token: "mock-token", environment: "sandbox", endpoint: "mock-endpoint"}
};

describe("BoundlessCheckout", () => {
	beforeEach(() => {
		mockStore.dispatch.mockClear();
	});

	test("appends a portal div to document.body on mount", () => {
		const childrenBefore = document.body.children.length;
		const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
		expect(document.body.children.length).toBeGreaterThan(childrenBefore);
		unmount();
	});

	test("removes the portal div from document.body on unmount", () => {
		const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
		const childrenAfterMount = document.body.children.length;
		unmount();
		expect(document.body.children.length).toBeLessThan(childrenAfterMount);
	});

	test("calls disableBodyScroll on mount", () => {
		const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
		unmount();
	});

	test("dispatches setBasicProps and showCheckout on mount", () => {
		const setBasicPropsType = setBasicProps({} as any).type;
		const showCheckoutType = showCheckout().type;
		render(<BoundlessCheckout {...defaultProps} />);
		const dispatchedTypes = mockStore.dispatch.mock.calls.map((call) => call[0].type);
		expect(dispatchedTypes).toContain(setBasicPropsType);
		expect(dispatchedTypes).toContain(showCheckoutType);
	});

	test("renders and updates the storefront footer menu", () => {
		const {rerender} = render(
			<BoundlessCheckout {...defaultProps} footerMenu={<a href="/store-info">Store info</a>} />
		);
		expect(screen.getByRole("link", {name: "Store info"})).toHaveAttribute("href", "/store-info");

		rerender(
			<BoundlessCheckout {...defaultProps} footerMenu={<a href="/store-policies">Store policies</a>} />
		);
		expect(screen.queryByRole("link", {name: "Store info"})).not.toBeInTheDocument();
		expect(screen.getByRole("link", {name: "Store policies"})).toHaveAttribute("href", "/store-policies");
	});

	test("QueryClient is not recreated across re-renders", () => {
		mockQueryClientConstructor.mockClear();
		const {rerender, unmount} = render(<BoundlessCheckout {...defaultProps} />);
		rerender(<BoundlessCheckout {...defaultProps} cartId="cart-1" />);
		rerender(<BoundlessCheckout {...defaultProps} cartId="cart-2" />);
		expect(mockQueryClientConstructor).toHaveBeenCalledTimes(1);
		unmount();
	});
});
