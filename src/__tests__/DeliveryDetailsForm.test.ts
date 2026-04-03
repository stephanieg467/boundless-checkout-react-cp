import {makeValidateDeliveryDetailsForm} from "../pages/deliveryDetailsPage/DeliveryDetailsForm";

describe("makeValidateDeliveryDetailsForm", () => {
  const validate = makeValidateDeliveryDetailsForm(true, false);
  const validateWithDropShip = makeValidateDeliveryDetailsForm(true, true);
  const validateDropShipOnly = makeValidateDeliveryDetailsForm(false, true);

  it("requires delivery_time when hasRegularItems is true", () => {
    expect(validate({delivery_time: ""})).toEqual({delivery_time: "Delivery time is required"});
  });

  it("passes when delivery_time is set and no drop-ship items", () => {
    expect(validate({delivery_time: "12:00 PM"})).toEqual({});
  });

  it("requires drop_ship_delivery_time when hasDropShipItems is true", () => {
    const errors = validateWithDropShip({delivery_time: "12:00 PM", drop_ship_delivery_time: ""});
    expect(errors).toEqual({drop_ship_delivery_time: "Drop-ship delivery time is required"});
  });

  it("passes when both times are set and hasDropShipItems is true", () => {
    expect(
      validateWithDropShip({delivery_time: "12:00 PM", drop_ship_delivery_time: "2:00 PM"})
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
