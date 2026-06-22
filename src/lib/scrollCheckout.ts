export const scrollCheckoutToTop = (): void => {
	document.querySelector<HTMLElement>(".bdl-checkout")?.scrollTo({top: 0, behavior: "smooth"});
};
