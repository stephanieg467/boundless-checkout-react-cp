import React, { useMemo } from "react";
import Grid from "@mui/material/Grid";
import { IAddress, IOrderService, TAddressType } from "boundless-api-client";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import useFormatCurrency from "../../hooks/useFormatCurrency";
import { ICovaCustomer } from "../../types/Order";

export default function OrderShipping({
	services,
	customer,
	hasShipping,
}: {
	services: IOrderService[];
	customer: ICovaCustomer | null;
	hasShipping: boolean;
}) {
	const delivery = useMemo(
		() => services.find((service) => service.is_delivery),
		[services]
	);
	const shippingAddress = useMemo(
		() =>
			customer?.addresses?.find(
				(address) => address.type === TAddressType.shipping
			) || null,
		[customer]
	);

	const { formatCurrency } = useFormatCurrency();

	if (!delivery) return null;

	return (
		<div className="bdl-order-items__service-row">
			<h5 className="bdl-order-items__service-heading">
				<LocalShippingIcon
					className="bdl-order-items__service-ico"
					fontSize="small"
				/>
				{delivery.serviceDelivery?.delivery?.title || ""}
			</h5>
			<Grid container>
				<Grid
					className="bdl-order-items__service-cell bdl-order-items__service-cell_title"
					size={{
						sm: 8,
						xs: 12,
					}}
				>
					{hasShipping && shippingAddress && (
						<ShippingAddress address={shippingAddress} delivery={delivery} />
					)}
				</Grid>
				<Grid
					className="bdl-order-items__service-cell"
					size={{
						sm: 2,
						xs: 12,
					}}
				></Grid>
				<Grid
					className="bdl-order-items__service-cell"
					size={{
						sm: 2,
						xs: 12,
					}}
				>
					<span className="bdl-order-items__label">
						{`${delivery.serviceDelivery?.delivery?.title} total `}
					</span>
					<span className="bdl-order-items__value">
						{delivery.total_price && formatCurrency(delivery.total_price)}
					</span>
				</Grid>
			</Grid>
		</div>
	);
}

const ShippingAddress = ({ address, delivery }: { address: IAddress, delivery: IOrderService }) => {
	const fullName = [address.first_name || "", address.last_name || ""]
		.join(" ")
		.trim();
	const cityCountry = [
		address.city,
		address.state,
		address.vwCountry?.title,
		address.zip,
	]
		.filter((el) => el)
		.join(", ");

	return (
		<>
			<p className="bdl-order-items__address-heading">{`${delivery.serviceDelivery?.delivery?.title} to`}</p>
			<address className="bdl-order-items__address">
				{fullName && (
					<p className="bdl-order-items__address-lane">{fullName}</p>
				)}
				{address.address_line_1 && (
					<p className="bdl-order-items__address-lane">
						{address.address_line_1}
					</p>
				)}
				{address.address_line_2 && (
					<p className="bdl-order-items__address-lane">
						{address.address_line_2}
					</p>
				)}
				{cityCountry && (
					<p className="bdl-order-items__address-lane">{cityCountry}</p>
				)}
				{address.company && (
					<p className="bdl-order-items__address-lane">{address.company}</p>
				)}
				{address.phone && (
					<p className="bdl-order-items__address-lane">
						<abbr title="Phone">Phone: </abbr>
						{address.phone}
					</p>
				)}
			</address>
		</>
	);
};
