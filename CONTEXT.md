# Domain Model

## Core Concepts

- **CheckoutConfig**: Static configuration values bound at checkout initialization. These values (such as `logo`, and callbacks like `onHide`, `onThankYouPage`, `onCheckoutInited`) determine how the checkout component visually integrates with the host application and handles exit scenarios, but they do not change over the life of a single checkout session.
- **CheckoutSession**: The serializable domain state of an ongoing checkout, such as items in the cart, current step, and running totals. Represented by the Redux `app` slice.
- **CartId**: An identifier for the current cart, acting as domain state required to initialize and persist a `CheckoutSession`.
