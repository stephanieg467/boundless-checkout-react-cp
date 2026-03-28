export interface DeliveryTimeSlot {
    days: string[];
    timeStart: string;
    timeEnd: string;
}
export declare const useDeliveryTimes: () => {
    isLoading: boolean;
    isError: boolean;
    data: {
        times: string[];
        isNextDay: boolean;
    } | undefined;
    rawData: DeliveryTimeSlot[] | undefined;
};
