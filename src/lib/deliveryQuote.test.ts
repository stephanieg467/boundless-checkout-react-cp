import {
  CHECKOUT_WINDOW_MS,
  isDeliveryQuoteFresh,
  requestDeliveryQuote,
  type DeliveryQuoteRequest,
} from "./deliveryQuote";

const address: DeliveryQuoteRequest = {
  street: "385 Martin St", unit: "2", city: "Penticton", province: "BC", postalCode: "V2A 5K6",
};
const quote = {status: "ok", fee: "6.00", zoneLabel: "Naramata", distanceKm: 20};
const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
});
afterAll(() => { global.fetch = originalFetch; });

const respond = (data: unknown, status = 200) => {
  fetchMock.mockResolvedValue({status, json: async () => data});
};

describe("requestDeliveryQuote", () => {
  it("posts the submitted address and returns the variable zone price", async () => {
    respond(quote);
    await expect(requestDeliveryQuote(address)).resolves.toEqual(quote);
    expect(fetchMock).toHaveBeenCalledWith("/api/deliveryQuote", {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(address),
    });
  });

  it("returns unavailable when the quote route cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("Network offline"));
    await expect(requestDeliveryQuote(address)).resolves.toEqual({status: "unavailable"});
  });

  it("returns unavailable when the route returns invalid JSON", async () => {
    fetchMock.mockResolvedValue({status: 200, json: async () => { throw new SyntaxError("Invalid JSON"); }});
    await expect(requestDeliveryQuote(address)).resolves.toEqual({status: "unavailable"});
  });

  it.each([201, 204, 400, 404, 500])("never prices a non-200 response (%s) even with an ok payload", async (status) => {
    respond(quote, status);
    await expect(requestDeliveryQuote(address)).resolves.toEqual({status: "unavailable"});
  });

  it.each([
    null,
    [],
    {status: "unknown", fee: "6.00"},
    {...quote, fee: undefined},
    {...quote, fee: 6},
    {...quote, fee: "-6.00"},
    {...quote, fee: ""},
    {...quote, fee: "NaN"},
    {...quote, fee: "Infinity"},
    {...quote, fee: "6.001"},
    {...quote, zoneLabel: " "},
    {...quote, distanceKm: undefined},
    {...quote, distanceKm: -1},
    {...quote, distanceKm: Infinity},
    {status: "out_of_range", maxKm: "30"},
    {status: "out_of_range", maxKm: -1},
    {status: "needs_confirmation", address: {...address, street: ""}},
    {status: "needs_confirmation", address: {...address, unit: 2}},
  ])("fails closed for a malformed quote payload (%j)", async (data) => {
    respond(data);
    await expect(requestDeliveryQuote(address)).resolves.toEqual({status: "unavailable"});
  });

  it.each([
    {status: "needs_confirmation", address: {...address, street: "387 Martin St"}},
    {status: "out_of_range", maxKm: 30},
    {status: "unverifiable"},
    {status: "unavailable"},
  ])("preserves a valid non-price outcome for the shipping form (%j)", async (data) => {
    respond(data);
    await expect(requestDeliveryQuote(address)).resolves.toEqual(data);
  });
});

describe("isDeliveryQuoteFresh", () => {
  const now = Date.UTC(2026, 9, 4, 12);
  const storedQuote = {fee: "6.00", zoneLabel: "Naramata", quotedAt: now};

  it("keeps a restored valid quote until the eight-hour checkout window expires", () => {
    expect(isDeliveryQuoteFresh({...storedQuote, quotedAt: now - CHECKOUT_WINDOW_MS + 1}, now)).toBe(true);
    expect(isDeliveryQuoteFresh({...storedQuote, quotedAt: now - CHECKOUT_WINDOW_MS}, now)).toBe(false);
    expect(isDeliveryQuoteFresh({...storedQuote, quotedAt: now - 9 * 60 * 60 * 1000}, now)).toBe(false);
  });

  it.each([
    undefined,
    {},
    {...storedQuote, quotedAt: undefined},
    {...storedQuote, quotedAt: String(now)},
    {...storedQuote, quotedAt: NaN},
    {...storedQuote, quotedAt: now + 1},
    {...storedQuote, fee: "invalid"},
    {...storedQuote, zoneLabel: ""},
  ])("rejects absent or corrupt restored quotes (%j)", (data) => {
    expect(isDeliveryQuoteFresh(data, now)).toBe(false);
  });

  it("uses the current clock by default for a newly persisted quote", () => {
    const clock = jest.spyOn(Date, "now").mockReturnValue(now);
    expect(isDeliveryQuoteFresh(storedQuote)).toBe(true);
    clock.mockRestore();
  });
});
