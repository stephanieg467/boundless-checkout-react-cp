import React from "react";
import {useAppSelector} from "../../hooks/redux";
import {TClickedElement} from "../../lib/elementEvents";
import {Logo} from "../Header";

export default function FooterAbout() {
	const {onHide} = useAppSelector((state) => state.app);
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
