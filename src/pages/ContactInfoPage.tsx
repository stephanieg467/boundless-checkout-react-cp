import React from 'react';
import CheckoutLayout from '../layout/CheckoutLayout';
import {useAppSelector} from '../hooks/redux';
import {TCheckoutAccountPolicy} from 'boundless-api-client';
import ContactInformationForm from '../components/ContactInformationForm';

export default function ContactInfoPage() {
	const {settings} = useAppSelector(state => state.app);
	const {accountPolicy} = settings!;

	return (
		<CheckoutLayout>
			{[TCheckoutAccountPolicy.guestAndLogin, TCheckoutAccountPolicy.guest].includes(accountPolicy) &&
			<ContactInformationForm />}

		</CheckoutLayout>
	);
}