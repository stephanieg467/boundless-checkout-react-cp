/**
 * Smoothly scrolls the checkout container back to the top.
 *
 * Used both on step navigation (StepRenderer) and on payment completion
 * (PaymentMethodForm) so the user always sees the top of the next view.
 */
export const scrollCheckoutToTop = (): void => {
	document.querySelector<HTMLElement>(".bdl-checkout")?.scrollTo({top: 0, behavior: "smooth"});
};
