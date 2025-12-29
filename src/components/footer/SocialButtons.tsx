import {faFacebook} from "@fortawesome/free-brands-svg-icons/faFacebook";
import {faInstagram} from "@fortawesome/free-brands-svg-icons/faInstagram";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from "react";

export default function SocialButtons() {
	return (
		<>
			<h3 className='page-footer__header'>Follow us</h3>
			<div className='page-footer__social-buttons'>
				<div className='page-footer__social-button'>
					<a aria-label={"Link to Cannabis Cottage facebook"} className='page-footer__social-link' target='_blank' href='https://www.facebook.com/thecottagepenticton/'>
						<FontAwesomeIcon className='social-icon' icon={faFacebook} />
					</a>
				</div>
				<div className='page-footer__social-button'>
					<a aria-label={"Link to Cannabis Cottage instagram"} className='page-footer__social-link' target='_blank' href='https://www.instagram.com/cannabis_cottage_penticton/'>
						<FontAwesomeIcon className='social-icon' icon={faInstagram} />
					</a>
				</div>
			</div>
			<p>All rights reserved. © {process.env.BUSINESS_TITLE}</p>
		</>
	);
}