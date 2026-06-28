export const scrollCheckoutToTop = (selector = ".bdl-checkout"): void => {
	document.querySelector<HTMLElement>(selector)?.scrollTo?.({top: 0, behavior: "smooth"});
};
