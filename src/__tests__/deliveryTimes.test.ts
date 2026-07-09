import {
  addBusinessDays,
  getDynamicDeliveryTimes,
  type DeliveryTimeSlot,
  type DeliveryTimesBase,
  type DeliveryTimesWithDropShip,
} from "../lib/deliveryTimes";

const setVancouverSystemTime = (isoDate: string) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(isoDate));
};

type DeliveryTimeSlotWithAsapMetadata = DeliveryTimeSlot & {
  asapDeliveryAvailable?: boolean;
};

type GeneratedDeliveryOptionWithAsapMetadata = {
  label: string;
  applyDeliveryFee: boolean;
  asapDeliveryAvailable?: boolean;
};

const normalizeMissingAsapToFalse = (
  times: GeneratedDeliveryOptionWithAsapMetadata[],
) => times.map(({label, applyDeliveryFee, asapDeliveryAvailable}) => ({
  label,
  applyDeliveryFee,
  asapDeliveryAvailable: asapDeliveryAvailable ?? false,
}));

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

describe("getDynamicDeliveryTimes delivery option metadata", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("propagates fee and ASAP metadata from Contentful windows to generated one-hour options", () => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const slots: DeliveryTimeSlotWithAsapMetadata[] = [
      {days: ["Monday"], timeStart: "11:00", timeEnd: "13:00", applyDeliveryFee: false, asapDeliveryAvailable: true},
      {days: ["Monday"], timeStart: "14:00", timeEnd: "16:00", applyDeliveryFee: true, asapDeliveryAvailable: false},
    ];

    const result: DeliveryTimesBase = getDynamicDeliveryTimes(slots);

    expect(result.times).toEqual([
      {label: "ASAP", applyDeliveryFee: false, asapDeliveryAvailable: true},
      {label: "11am - 12pm", applyDeliveryFee: false, asapDeliveryAvailable: true},
      {label: "12pm - 1pm", applyDeliveryFee: false, asapDeliveryAvailable: true},
      {label: "2pm - 3pm", applyDeliveryFee: true, asapDeliveryAvailable: false},
      {label: "3pm - 4pm", applyDeliveryFee: true, asapDeliveryAvailable: false},
    ]);
  });

  it("defaults missing metadata to backward-compatible delivery option values", () => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const slots: DeliveryTimeSlot[] = [
      {days: ["Monday"], timeStart: "11:00", timeEnd: "12:00"},
    ];

    const result: DeliveryTimesBase = getDynamicDeliveryTimes(slots);

    expect(normalizeMissingAsapToFalse(result.times)).toEqual([
      {label: "11am - 12pm", applyDeliveryFee: true, asapDeliveryAvailable: false},
    ]);
  });

  it("returns metadata for both regular times and dropShipTimes when returnBothDays is true", () => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const slots: DeliveryTimeSlotWithAsapMetadata[] = [
      {days: ["Monday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
      {days: ["Wednesday"], timeStart: "13:00", timeEnd: "14:00", applyDeliveryFee: false, asapDeliveryAvailable: false},
    ];

    const result = getDynamicDeliveryTimes(slots, true) as DeliveryTimesWithDropShip;

    expect(result.times).toEqual([
      {label: "ASAP", applyDeliveryFee: true, asapDeliveryAvailable: true},
      {label: "11am - 12pm", applyDeliveryFee: true, asapDeliveryAvailable: true},
    ]);
    expect(result.dropShipTimes.times).toEqual([
      {label: "1pm - 2pm", applyDeliveryFee: false, asapDeliveryAvailable: false},
    ]);
  });
});

describe("getDynamicDeliveryTimes synthetic ASAP option", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("prepends exactly one ASAP option using the fee from the earliest eligible currently selectable option", () => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const slots: DeliveryTimeSlotWithAsapMetadata[] = [
      {days: ["Monday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: false, asapDeliveryAvailable: false},
      {days: ["Monday"], timeStart: "12:00", timeEnd: "13:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
      {days: ["Monday"], timeStart: "14:00", timeEnd: "15:00", applyDeliveryFee: false, asapDeliveryAvailable: true},
    ];

    const result: DeliveryTimesBase = getDynamicDeliveryTimes(slots);

    expect(result.isNextDay).toBe(false);
    expect(result.times.filter(({label}) => label === "ASAP")).toHaveLength(1);
    expect(result.times[0]).toMatchObject({label: "ASAP", applyDeliveryFee: true});
    expect(result.times.map(({label}) => label)).toEqual([
      "ASAP",
      "11am - 12pm",
      "12pm - 1pm",
      "2pm - 3pm",
    ]);
  });

  it("inherits applyDeliveryFee false from the earliest eligible currently selectable option", () => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const slots: DeliveryTimeSlotWithAsapMetadata[] = [
      {days: ["Monday"], timeStart: "09:00", timeEnd: "10:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
      {days: ["Monday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: false, asapDeliveryAvailable: true},
      {days: ["Monday"], timeStart: "12:00", timeEnd: "13:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
    ];

    const result: DeliveryTimesBase = getDynamicDeliveryTimes(slots);

    expect(result.isNextDay).toBe(false);
    expect(result.times[0]).toMatchObject({label: "ASAP", applyDeliveryFee: false});
    expect(result.times.map(({label}) => label)).toEqual([
      "ASAP",
      "11am - 12pm",
      "12pm - 1pm",
    ]);
  });

  it.each([
    {
      name: "missing",
      slots: [{days: ["Monday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: true}],
    },
    {
      name: "false",
      slots: [{days: ["Monday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: true, asapDeliveryAvailable: false}],
    },
  ])("does not add ASAP when asapDeliveryAvailable is $name", ({slots}) => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const result: DeliveryTimesBase = getDynamicDeliveryTimes(slots);

    expect(result.isNextDay).toBe(false);
    expect(result.times.map(({label}) => label)).toEqual(["11am - 12pm"]);
  });

  it("does not add ASAP when delivery rolls over to next-day options", () => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const slots: DeliveryTimeSlotWithAsapMetadata[] = [
      {days: ["Monday"], timeStart: "09:00", timeEnd: "10:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
      {days: ["Tuesday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
    ];

    const result: DeliveryTimesBase = getDynamicDeliveryTimes(slots);

    expect(result.isNextDay).toBe(true);
    expect(result.times.map(({label}) => label)).toEqual(["11am - 12pm"]);
  });

  it("does not add ASAP to dropShipTimes when returnBothDays is true", () => {
    setVancouverSystemTime("2026-03-30T17:00:00Z"); // Monday 10am in Vancouver

    const slots: DeliveryTimeSlotWithAsapMetadata[] = [
      {days: ["Monday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
      {days: ["Wednesday"], timeStart: "11:00", timeEnd: "12:00", applyDeliveryFee: true, asapDeliveryAvailable: true},
    ];

    const result = getDynamicDeliveryTimes(slots, true) as DeliveryTimesWithDropShip;

    expect(result.times.map(({label}) => label)).toEqual(["ASAP", "11am - 12pm"]);
    expect(result.dropShipTimes.times.map(({label}) => label)).toEqual(["11am - 12pm"]);
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
