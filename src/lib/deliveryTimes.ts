import {DeliveryTimeSlot} from "../hooks/useDeliveryTimes";

// Helper functions for dynamic delivery times

type TimeWindow = {
	start: number; // Hour in 24h format (e.g., 11 for 11am, 13 for 1pm)
	end: number; // Hour in 24h format, can be fractional (e.g., 20.5 for 8:30pm)
};

const parseTimeStringToNumber = (timeStr: string): number => {
	const [hoursStr, minutesStr] = timeStr.split(":");
	const hours = parseInt(hoursStr, 10);
	const minutes = parseInt(minutesStr, 10);
	return hours + minutes / 60;
};

const getSchedule = (
	weekdayName: string,
	deliveryTimesData: DeliveryTimeSlot[],
): TimeWindow[] => {
	return deliveryTimesData
		? deliveryTimesData
				.filter((slot) => slot.days.includes(weekdayName))
				.map((slot) => ({
					start: parseTimeStringToNumber(slot.timeStart),
					end: parseTimeStringToNumber(slot.timeEnd),
				}))
				.sort((a, b) => a.start - b.start)
		: [];
};

/**
 * Determines if delivery should be disabled based on the current time vs the last delivery window.
 * Delivery is disabled when currentTime > lastSlotEnd - 0.5 (30 minutes before last window ends).
 *
 * @param deliveryTimesData - Array of delivery time slots from the API
 * @returns true if delivery should be disabled, false otherwise
 */
export const isDeliveryDisabled = (
	deliveryTimesData: DeliveryTimeSlot[],
): boolean => {
	if (!deliveryTimesData || deliveryTimesData.length === 0) {
		return true;
	}

	const {hourVancouver, minuteVancouver, weekdayName} =
		getVancouverDateTime();
	const currentTime = hourVancouver + minuteVancouver / 60;

	// Get today's schedule
	const todaySchedule = getSchedule(weekdayName, deliveryTimesData);

	// If no schedule for today, delivery is disabled
	if (todaySchedule.length === 0) {
		return true;
	}

	// Find the last window
	const lastWindow = todaySchedule[todaySchedule.length - 1];

	// Calculate the last 1-hour slot end time
	// We iterate from start hour up to find the last full hour slot that fits
	let lastSlotEnd = lastWindow.start;
	while (lastSlotEnd + 1 <= lastWindow.end) {
		lastSlotEnd += 1;
	}

	// Disable if current time > lastSlotEnd - 0.5 (30 min buffer)
	return currentTime > lastSlotEnd - 0.5;
};

export const getVancouverDateTime = (baseDate: Date = new Date()) => {
	const options: Intl.DateTimeFormatOptions = {
		timeZone: "America/Vancouver",
		hour: "numeric", // Get hour in numeric format (e.g., "14")
		minute: "numeric", // Get minute in numeric format (e.g., "30")
		weekday: "long", // Get the full name of the weekday (e.g., "Monday")
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour12: false, // Use 24-hour format for the hour
	};
	const formatter = new Intl.DateTimeFormat("en-CA", options);
	const parts = formatter.formatToParts(baseDate);

	let hourVancouver = 0;
	let minuteVancouver = 0;
	let weekdayName = "";
	let year = 0;
	let month = 0;
	let day = 0;

	for (const part of parts) {
		switch (part.type) {
			case "hour":
				// The hour might be '24' for midnight in some locales with hourCycle h24, map to 0.
				// For hourCycle h23 (default for en-CA numeric), it's 0-23.
				const hr = parseInt(part.value);
				hourVancouver = hr === 24 ? 0 : hr;
				break;
			case "minute":
				minuteVancouver = parseInt(part.value);
				break;
			case "weekday":
				weekdayName = part.value;
				break;
			case "year":
				year = parseInt(part.value);
				break;
			case "month":
				month = parseInt(part.value);
				break;
			case "day":
				day = parseInt(part.value);
				break;
		}
	}

	const dayMap: { [key: string]: number } = {
		Sunday: 0,
		Monday: 1,
		Tuesday: 2,
		Wednesday: 3,
		Thursday: 4,
		Friday: 5,
		Saturday: 6,
	};
	const dayOfWeek = dayMap[weekdayName];

	return {
		dayOfWeek,
		hourVancouver,
		minuteVancouver,
		year,
		month,
		day,
		weekdayName,
	};
};

const formatTime = (time: number): string => {
	const hour = Math.floor(time);
	const minutes = Math.round((time - hour) * 60);
	const period = hour >= 12 ? "pm" : "am";
	const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
	const minutesStr = minutes > 0 ? `:${minutes}` : "";
	return `${displayHour}${minutesStr}${period}`;
};

// Returns date string "YYYY-MM-DD"
const getDateString = (year: number, month: number, day: number) => {
	return `${year}-${month}-${day}`;
};

export const getDynamicDeliveryTimes = (
	deliveryTimesData: DeliveryTimeSlot[],
): { times: string[]; isNextDay: boolean } => {
	const now = new Date();
	const {hourVancouver, minuteVancouver} = getVancouverDateTime(now);
	const currentTime = hourVancouver + minuteVancouver / 60;

	let deliveryTimes = calculateSlotsForDate(
		now,
		deliveryTimesData,
		currentTime,
	);

	if (deliveryTimes.length > 0) {
		return {times: deliveryTimes, isNextDay: false};
	}

	// If no slots today, try tomorrow
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);

	// For tomorrow, we don't care about currentTime (it's in the future)
	deliveryTimes = calculateSlotsForDate(tomorrow, deliveryTimesData, -1);

	return {times: deliveryTimes, isNextDay: true};
};

const calculateSlotsForDate = (
	date: Date,
	deliveryTimesData: DeliveryTimeSlot[],
	currentTime: number,
): string[] => {
	const {year, month, day, weekdayName} = getVancouverDateTime(date);
	const dateString = getDateString(year, month, day);

	// Transform deliveryTimesData to today's schedule
	const regularSchedule = getSchedule(weekdayName, deliveryTimesData);

	// Exception Dates for 2026
	const exceptionSchedules: { [key: string]: TimeWindow[] } = {
		"2026-1-22": [
			{ start: 11, end: 13 },
			{ start: 15, end: 16 },
		],
		"2026-1-24": [
			{ start: 13, end: 17 },
			{ start: 20, end: 21 },
		],
		"2026-1-26": [
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
		],
		"2026-1-27": [
			{ start: 11, end: 13 },
			{ start: 15, end: 16 },
			{ start: 19, end: 20.5 },
		],
	};

	// Determine applicable schedule
	let schedule = regularSchedule;
	if (exceptionSchedules[dateString]) {
		schedule = exceptionSchedules[dateString];
	}

	const deliveryTimes: string[] = [];

	// 1. Generate 1-hour windows
	schedule.forEach((window) => {
		// We iterate from the start hour up to the end hour
		// We can fit a 1-hour slot if (start + 1) <= end
		let slotStart = window.start;
		while (slotStart + 1 <= window.end) {
			if (slotStart + 0.5 > currentTime) {
				let slotEnd = slotStart + 1;

				// Lengthen the last delivery window by up to 30 min if it matches window.end
				if (slotEnd < window.end && window.end - slotEnd <= 0.51) {
					slotEnd = window.end;
				}

				const startStr = formatTime(slotStart);
				const endStr = formatTime(slotEnd);
				deliveryTimes.push(`${startStr} - ${endStr}`);
			}
			slotStart += 1;
		}
	});

	return deliveryTimes;
};
