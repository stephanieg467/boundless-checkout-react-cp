// Helper functions for dynamic delivery times
export const getVancouverDateTime = () => {
	const now = new Date();
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
	const parts = formatter.formatToParts(now);

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

	return { dayOfWeek, hourVancouver, minuteVancouver, year, month, day };
};

type TimeWindow = {
	start: number; // Hour in 24h format (e.g., 11 for 11am, 13 for 1pm)
	end: number; // Hour in 24h format, can be fractional (e.g., 20.5 for 8:30pm)
};

const formatHour = (hour: number): string => {
	const period = hour >= 12 ? "pm" : "am";
	const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
	return `${displayHour}${period}`;
};

// Returns date string "YYYY-MM-DD"
const getDateString = (year: number, month: number, day: number) => {
	return `${year}-${month}-${day}`;
};

export const getDynamicDeliveryTimes = () => {
	const { dayOfWeek, hourVancouver, minuteVancouver, year, month, day } =
		getVancouverDateTime();
	const currentTime = hourVancouver + minuteVancouver / 60;
	const dateString = getDateString(year, month, day);

	// Define Schedules
	const regularWeekSchedules: { [key: number]: TimeWindow[] } = {
		// Sun (0) - Thurs (4)
		0: [
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
			{ start: 19, end: 20.5 },
		],
		1: [
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
			{ start: 19, end: 20.5 },
		],
		2: [
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
			{ start: 19, end: 20.5 },
		],
		3: [
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
			{ start: 19, end: 20.5 },
		],
		4: [
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
			{ start: 19, end: 20.5 },
		],
		// Fri (5)
		5: [
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
			{ start: 20, end: 21.5 },
		],
		// Sat (6)
		6: [
			{ start: 11, end: 17 },
			{ start: 20, end: 21.5 },
		],
	};

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
	let todaysSchedule = regularWeekSchedules[dayOfWeek] || [];
	if (exceptionSchedules[dateString]) {
		todaysSchedule = exceptionSchedules[dateString];
	}

	const deliveryTimes: string[] = [];

	// 1. Determine "ASAP" availability
	// Available if current time is within any of the windows
	const isASAPAvailable = todaysSchedule.some(
		(window) => currentTime >= window.start && currentTime < window.end
	);

	if (isASAPAvailable) {
		deliveryTimes.push("ASAP");
	}

	// 2. Generate 1-hour windows
	todaysSchedule.forEach((window) => {
		// We iterate from the start hour up to the end hour
		// We can fit a 1-hour slot if (start + 1) <= end
		let slotStart = window.start;
		while (slotStart + 1 <= window.end) {
			// Logic: Show the slot if it's in the future.
			// Specifically, if we are currently at 10:30, we can show 11am-12pm.
			// If we are at 11:00, we typically don't show 11am-12pm for "delivery" as it's instant.
			// However, keeping simple logic: show if the slot starts AFTER the current time (with small buffer? No, simple strict).
			// If current time is 10:59, 11-12 is valid.
			// If current time is 11:01, 11-12 is invalid.

			if (slotStart > currentTime) {
				const startStr = formatHour(slotStart);
				const endStr = formatHour(slotStart + 1);
				deliveryTimes.push(`${startStr} - ${endStr}`);
			}
			slotStart += 1;
		}
	});

	return deliveryTimes;
};
