import React from "react";
import FooterAbout from "./footer/About";
import FooterContacts from "./footer/Contacts";
import FooterMenu from "./footer/FooterMenu";
import SocialButtons from "./footer/SocialButtons";

export default function Footer() {
	return (
		<footer className='page-footer'>
			<div className='container'>
				<div className='row'>
					<div className='page-footer__item col-sm-12 col-md-6 col-lg-3 order-lg-1 order-md-3 order-4'>
						<FooterAbout/>
					</div>
					<div className='page-footer__item col-sm-12 col-md-6 col-lg-3 order-lg-2 order-md-1 order-1'>
						<FooterMenu/>
					</div>
					<div className='page-footer__item col-sm-12 col-md-6 col-lg-3 order-lg-3 order-md-2 order-2'>
						<FooterContacts />
					</div>
					<div className='page-footer__item col-sm-12 col-md-6 col-lg-3 order-lg-4 order-md-4 order-3'>
						<SocialButtons />
					</div>
				</div>
			</div>
		</footer>
	);
}
