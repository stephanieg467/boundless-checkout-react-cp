import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useAppSelector } from "../hooks/redux";
import useFormatCurrency from "../hooks/useFormatCurrency";

const FreeShippingBanner: React.FC = () => {
	const { total } = useAppSelector((state) => state.app);
	const { formatCurrency } = useFormatCurrency();
	
	const itemsSubTotal = Number(total?.itemsSubTotal?.price || 0);
	const freeShippingThreshold = 100;
	const remainingForFreeShipping = freeShippingThreshold - itemsSubTotal;
	
	// Don't show banner if already qualifies for free shipping
	if (itemsSubTotal >= freeShippingThreshold) {
		return (
			<Alert 
				severity="success" 
				icon={<LocalShippingIcon />}
				sx={{ 
					mb: 2,
					backgroundColor: '#e8f5e8',
					'& .MuiAlert-icon': {
						color: '#4a7c4d'
					}
				}}
			>
				<Typography variant="body2" sx={{ fontWeight: 'bold' }}>
					Congratulations! You qualify for FREE SHIPPING on this order!
				</Typography>
			</Alert>
		);
	}
	
	// Show how much more is needed for free shipping
	if (remainingForFreeShipping > 0) {
		return (
			<Alert 
				severity="info" 
				icon={<LocalShippingIcon />}
				sx={{ 
					mb: 2,
					backgroundColor: '#e3f2fd',
					'& .MuiAlert-icon': {
						color: '#1976d2'
					}
				}}
			>
				<Box>
					<Typography variant="body2" sx={{ fontWeight: 'bold' }}>
						Free shipping on orders over {formatCurrency(freeShippingThreshold)}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Add {formatCurrency(remainingForFreeShipping)} more to qualify for free shipping!
					</Typography>
				</Box>
			</Alert>
		);
	}
	
	return null;
};

export default FreeShippingBanner;
