import { DeliveryTimeSlot } from "../hooks/useDeliveryTimes";
export declare const getVancouverDateTime: (baseDate?: Date) => {
    dayOfWeek: number;
    hourVancouver: number;
    minuteVancouver: number;
    year: number;
    month: number;
    day: number;
    weekdayName: string;
};
export declare const getDynamicDeliveryTimes: (deliveryTimesData: DeliveryTimeSlot[]) => {
    times: string[];
    isNextDay: boolean;
};
