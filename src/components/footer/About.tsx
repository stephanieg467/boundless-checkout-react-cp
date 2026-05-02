import React from "react";
import {useAppSelector} from "../../hooks/redux";
import {TClickedElement} from "../../lib/elementEvents";
import {Logo} from "../Header";
import { useCheckoutConfig } from "../../contexts/CheckoutConfigContext";

export default function FooterAbout() {
	const {onHide} = useCheckoutConfig();
	const onLogoClicked = (e: React.MouseEvent<HTMLAnchorElement>) => {
		e.preventDefault();
		onHide!(TClickedElement.logo);
	};
	return (
		<>
			<a href={"#"} className={"bdl-header__logo"} onClick={onLogoClicked}>
				<Logo />
			</a>
		</>
	);
}
