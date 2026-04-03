import {makeValidateDeliveryDetailsForm} from "../pages/deliveryDetailsPage/DeliveryDetailsForm";

describe("makeValidateDeliveryDetailsForm", () => {
  const validate = makeValidateDeliveryDetailsForm(false);
  const validateWithDropShip = makeValidateDeliveryDetailsForm(true);

  it("requires delivery_time", () => {
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
});
