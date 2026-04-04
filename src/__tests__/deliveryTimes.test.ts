import {getDynamicDeliveryTimes, addBusinessDays, DeliveryTimesWithDropShip} from "../lib/deliveryTimes";
import {DeliveryTimeSlot} from "../hooks/useDeliveryTimes";

describe("addBusinessDays", () => {
  it("adds 2 business days from a Monday (Monday + 2 = Wednesday)", () => {
    // 2026-03-30 is a Monday
    const monday = new Date("2026-03-30T12:00:00Z");
    const result = addBusinessDays(monday, 2);
    const {year, month, day} = getVancouverDateTimeParts(result);
    expect(`${year}-${month}-${day}`).toBe("2026-4-1"); // Wednesday
  });

  it("adds 2 business days from a Thursday (Thursday + 2 = Monday, skipping weekend)", () => {
    // 2026-04-02 is a Thursday
    const thursday = new Date("2026-04-02T12:00:00Z");
    const result = addBusinessDays(thursday, 2);
    const {year, month, day} = getVancouverDateTimeParts(result);
    expect(`${year}-${month}-${day}`).toBe("2026-4-6"); // Monday
  });

  it("adds 2 business days from a Friday (Friday + 2 = Tuesday, skipping weekend)", () => {
    // 2026-04-03 is a Friday
    const friday = new Date("2026-04-03T12:00:00Z");
    const result = addBusinessDays(friday, 2);
    const {year, month, day} = getVancouverDateTimeParts(result);
    expect(`${year}-${month}-${day}`).toBe("2026-4-7"); // Tuesday
  });

  it("adds 2 business days from a Saturday (Saturday + 2 = Wednesday, skipping Sunday)", () => {
    // 2026-04-04 is a Saturday
    const saturday = new Date("2026-04-04T12:00:00Z");
    const result = addBusinessDays(saturday, 2);
    const {year, month, day} = getVancouverDateTimeParts(result);
    expect(`${year}-${month}-${day}`).toBe("2026-4-8"); // Wednesday
  });
});

describe("getDynamicDeliveryTimes with returnBothDays", () => {
  const allDaysSlots: DeliveryTimeSlot[] = [
    {days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], timeStart: "11:00", timeEnd: "17:00"},
  ];

  it("returns dropShipTimes when returnBothDays is true", () => {
    const result = getDynamicDeliveryTimes(allDaysSlots, true) as DeliveryTimesWithDropShip;
    expect(result).toHaveProperty("dropShipTimes");
    expect(result.dropShipTimes).toHaveProperty("times");
    expect(result.dropShipTimes).toHaveProperty("date");
    expect(Array.isArray(result.dropShipTimes.times)).toBe(true);
    expect(typeof result.dropShipTimes.date).toBe("string");
    expect(result.dropShipTimes.date.length).toBeGreaterThan(0);
  });

  it("does not return dropShipTimes when returnBothDays is false", () => {
    const result = getDynamicDeliveryTimes(allDaysSlots, false);
    expect(result).not.toHaveProperty("dropShipTimes");
  });

  it("does not return dropShipTimes when returnBothDays is omitted", () => {
    const result = getDynamicDeliveryTimes(allDaysSlots);
    expect(result).not.toHaveProperty("dropShipTimes");
  });
});

// Helper to extract date parts in Vancouver time for assertions
function getVancouverDateTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(date);
  let year = 0, month = 0, day = 0;
  for (const part of parts) {
    if (part.type === "year") year = parseInt(part.value);
    if (part.type === "month") month = parseInt(part.value);
    if (part.type === "day") day = parseInt(part.value);
  }
  return {year, month, day};
}
