import {faWhatsapp} from "@fortawesome/free-brands-svg-icons/faWhatsapp";
import {faEnvelope} from "@fortawesome/free-solid-svg-icons";
import {faClock} from "@fortawesome/free-solid-svg-icons/faClock";
import {faMapMarkerAlt} from "@fortawesome/free-solid-svg-icons/faMapMarkerAlt";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from "react";

export default function FooterContacts() {
	return (
		<>
			<h3 className='page-footer__header'>Contact Us</h3>
			<p className='page-footer__icon-w-link'>
				<span className='icon'>
					<FontAwesomeIcon icon={faEnvelope} />
				</span>
				<a className='link' href={`mailto:${process.env.NEXT_PUBLIC_ADMIN_EMAIL}`}>{process.env.NEXT_PUBLIC_ADMIN_EMAIL}</a>
			</p>
			<p className='page-footer__icon-w-link'>
				<span className='icon'>
					<FontAwesomeIcon icon={faWhatsapp} />
				</span>
				<a className='link' href='tel:7786222933'>(778) 622-2933</a>
			</p>
			<p className='page-footer__icon-w-link'>
				<span className='icon'>
					<FontAwesomeIcon icon={faMapMarkerAlt} />
				</span>
				<a className='link'  target='_blank' href='https://www.google.com/maps/place/Cannabis+Cottage/@49.4971498,-119.5932373,15z/data=!4m2!3m1!1s0x0:0xa37bc9e38a394158?sa=X&ved=1t:2428&ictx=111'>385 Martin St Penticton, BC V2A 5K6</a>
			</p>
			<p className='page-footer__icon-w-link'>
				<span className='icon'>
					<FontAwesomeIcon icon={faClock} />
				</span>
				9:00am &mdash; 9:00pm Sun - Thurs
			</p>
			<p className='page-footer__icon-w-link'>
				<span className='icon'>
					<FontAwesomeIcon icon={faClock} />
				</span>
				9:00am &mdash; 10:00pm Fri - Sat
			</p>
		</>
	);
}