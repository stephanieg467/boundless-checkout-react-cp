import {useQuery} from "@tanstack/react-query";
import {ICovaCustomer} from "../types/customer";
import to from "await-to-js";
import {IOrderWithCustmAttr} from "../types/Order";

export const useCustomer = (order?: IOrderWithCustmAttr) => {
	const {
		isSuccess,
		isError,
		data: customer,
		error,
	} = useQuery({
		queryKey: ["customer", order?.customer?.first_name, order?.customer?.last_name],
		enabled: order !== undefined && order.customer !== undefined && order.customer.first_name !== undefined,
		staleTime: 900000, // 15 minutes
		queryFn: async (): Promise<ICovaCustomer> => {
			const [err, resp] = await to(
				fetch("/api/covaCustomer", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({order: order ?? {}}),
				})
			);

			if (err || !resp) {
				console.error("Failed to getCovaCustomer", err);
				throw new Error("Failed to getCovaCustomer");
			}

			const [parseErr, data] = await to(resp.json());
			if (parseErr) {
				console.error("Failed to parse getCovaCustomer response", parseErr);
				throw new Error("Failed to parse getCovaCustomer response");
			}

			return data;
		},
	});

	return {customer, isSuccess, isError, error};
};
