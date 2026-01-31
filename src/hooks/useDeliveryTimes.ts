import {useQuery} from "@tanstack/react-query";
import to from "await-to-js";
import {useMemo} from "react";
import {getDynamicDeliveryTimes} from "../lib/deliveryTimes";

export interface DeliveryTimeSlot {
	days: string[];
	timeStart: string;
	timeEnd: string;
}

export const useDeliveryTimes = () => {
	const {
		isLoading: loadingDeliveryTimes,
		isError: errorLoadingDeliveryTimes,
		data,
	} = useQuery({
		queryKey: ["deliveryTimes"],
		staleTime: 900000, // 15 minutes
		queryFn: async (): Promise<DeliveryTimeSlot[]> => {
			const [err, resp] = await to(
				fetch("/api/deliveryTimes", {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				})
			);

			if (err || !resp) {
				console.error("Failed to deliveryTimes", err);
				throw new Error("Failed to deliveryTimes");
			}

			const [parseErr, data] = await to(resp.json());

			if (parseErr) {
				console.error("Failed to parse deliveryTimes response", parseErr);
				throw new Error("Failed to parse deliveryTimes response");
			}

			return data;
		},
	});
	const deliveryTimes = useMemo(() => {
		if (!loadingDeliveryTimes && !errorLoadingDeliveryTimes && data) {
			return getDynamicDeliveryTimes(data);
		}
	}, [loadingDeliveryTimes, errorLoadingDeliveryTimes, data]);

	return {
		isLoading: loadingDeliveryTimes,
		isError: errorLoadingDeliveryTimes,
		data: deliveryTimes,
		rawData: data,
	};
};
