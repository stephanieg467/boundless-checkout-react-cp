# Boundless Checkout React Component CP

## Installation

`yarn add boundless-api-client boundless-checkout-react-cp` 

Or via NPM:

`npm install boundless-api-client boundless-checkout-react-cp --save`

## Getting Started

1. Add component to the checkout page:

```jsx
import {startCheckout, StarterWrapper} from 'boundless-checkout-react-cp';

const starter = startCheckout(document.querySelector('.some-el'), {
	api: apiClient,
	onHide: () => console.log('on hide'),
	onThankYouPage: (data) =>  console.log('on thank you page', data),
	basename: '/shop/checkout',
	cartId: 'uid',
	logoSrc: 'https://domain/logo.png',
	logoText: 'My Logo'
});
```

Props `onHide`, `onThankYouPage` - are required, others are optional.

`basename` - Start url for the checkout. If checkout located at `/checkout`, then `basename: '/checkout'`.

2. Need more example? Look at: [Checkout page at Next.js](https://github.com/kirill-zhirnov/boundless-nextjs-sample/blob/master/pages/checkout/%5B%5B...slug%5D%5D.tsx)

---

[NextJS eCommerce templates](https://boundless-commerce.com/templates) - Free. Ready to use. Just clone & deploy!
