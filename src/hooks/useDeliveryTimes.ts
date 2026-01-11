import { useQuery } from "@tanstack/react-query";
import to from "await-to-js";
import { useMemo } from "react";
import { getDynamicDeliveryTimes } from "../lib/deliveryTimes";

export interface DeliveryTimeSlot {
	days: string[];
	timeStart: string;
	timeEnd: string;
}

const dataExample = [
	{
		days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
		timeStart: "11:00",
		timeEnd: "13:00",
	},
	{
		days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
		timeStart: "15:00",
		timeEnd: "17:00",
	},
	{
		days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
		timeStart: "19:00",
		timeEnd: "20:30",
	},
	{
		days: ["Friday"],
		timeStart: "11:00",
		timeEnd: "13:00",
	},
	{
		days: ["Friday"],
		timeStart: "15:00",
		timeEnd: "17:00",
	},
	{
		days: ["Friday"],
		timeStart: "20:00",
		timeEnd: "21:30",
	},
	{
		days: ["Saturday"],
		timeStart: "11:00",
		timeEnd: "17:00",
	},
	{
		days: ["Saturday"],
		timeStart: "18:00",
		timeEnd: "19:30",
	},
];

export const useDeliveryTimes = () => {
	const {
		isLoading: loadingDeliveryTimes,
		isError: errorLoadingDeliveryTimes,
		data,
	} = useQuery({
		queryKey: ["deliveryTimes"],
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
	};
};
