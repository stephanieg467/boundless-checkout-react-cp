import {makeValidateDeliveryDetailsForm} from "../pages/deliveryDetailsPage/DeliveryDetailsForm";

describe("makeValidateDeliveryDetailsForm", () => {
  const validate = makeValidateDeliveryDetailsForm(true, false, true);
  const validateWithDropShip = makeValidateDeliveryDetailsForm(true, true, true);
  const validateDropShipOnly = makeValidateDeliveryDetailsForm(false, true, true);

  it("does not require delivery_time for regular items", () => {
    expect(validate({delivery_time: ""})).toEqual({});
  });

  it("passes when delivery_time is set and no drop-ship items", () => {
    expect(validate({delivery_time: "12:00 PM"})).toEqual({});
  });

  it("requires only drop_ship_delivery_time when mixed carts have drop-ship items", () => {
    const errors = validateWithDropShip({delivery_time: "", drop_ship_delivery_time: ""});
    expect(errors).toEqual({drop_ship_delivery_time: "Drop-ship delivery time is required"});
  });

  it("passes when drop_ship_delivery_time is set and hasDropShipItems is true", () => {
    expect(
      validateWithDropShip({delivery_time: "", drop_ship_delivery_time: "2:00 PM"})
    ).toEqual({});
  });

  it("does not require drop_ship_delivery_time when hasDropShipItems is false", () => {
    expect(validate({delivery_time: "12:00 PM", drop_ship_delivery_time: ""})).toEqual({});
  });

  it("does not require delivery_time when hasRegularItems is false", () => {
    expect(validateDropShipOnly({delivery_time: "", drop_ship_delivery_time: ""})).toEqual({
      drop_ship_delivery_time: "Drop-ship delivery time is required",
    });
  });

  it("passes for drop-ship-only cart when drop_ship_delivery_time is set", () => {
    expect(
      validateDropShipOnly({delivery_time: "", drop_ship_delivery_time: "2:00 PM"})
    ).toEqual({});
  });
});
