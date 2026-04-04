import React from "react";
import {Form, Formik, FormikHelpers} from "formik";
import {Box, Button, TextField, Typography} from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import {useAppDispatch, useAppSelector} from "../../hooks/redux";
import {addFilledStep, setCurrentStep, setOrder} from "../../redux/reducers/app";
import {TCheckoutStep} from "../../types/common";
import {getCheckoutData, setLocalStorageCheckoutData} from "../../hooks/checkoutData";
import {fieldAttrs} from "../../lib/formUtils";
import {IOrderWithCustmAttr} from "../../types/Order";
import {useDeliveryTimes} from "../../hooks/useDeliveryTimes";
import {DeliveryTimesWithDropShip} from "../../lib/deliveryTimes";

const hasDropShipTimes = (data: unknown): data is DeliveryTimesWithDropShip =>
  !!data && typeof data === "object" && "dropShipTimes" in data;

const renderDeliveryTimeOptions = (
  times: string[] | undefined,
  isLoading: boolean,
  hasError: boolean,
) => (
  <>
    <option value=""></option>
    {isLoading ? (
      <option disabled value="">{"Loading delivery times..."}</option>
    ) : !hasError && times ? (
      times.map((t, idx) => (
        <option key={idx} value={t}>{t}</option>
      ))
    ) : (
      <option disabled>
        {"Error loading delivery times. Please contact info@cannabis-cottage.ca."}
      </option>
    )}
  </>
);
import {ordersDropShippingItems, ordersRegularItems} from "../../lib/products";

export interface IDeliveryDetailsFormValues {
  delivery_time: string;
  drop_ship_delivery_time?: string;
}

export const makeValidateDeliveryDetailsForm =
  (hasRegularItems: boolean, hasDropShipItems: boolean) =>
  (values: IDeliveryDetailsFormValues) => {
    const errors: Partial<Record<keyof IDeliveryDetailsFormValues, string>> = {};
    if (hasRegularItems && !values.delivery_time) {
      errors.delivery_time = "Delivery time is required";
    }
    if (hasDropShipItems && !values.drop_ship_delivery_time) {
      errors.drop_ship_delivery_time = "Drop-ship delivery time is required";
    }
    return errors;
  };

const useSaveDeliveryDetails = () => {
  const dispatch = useAppDispatch();
  const {order, items} = useAppSelector((state) => state.app);
  const dropShipItems = ordersDropShippingItems(items ?? []);
  const hasDropShipItems = dropShipItems.length > 0;
  const regularItems = ordersRegularItems(items ?? []);

  const onSubmit = (
    values: IDeliveryDetailsFormValues,
    {setSubmitting}: FormikHelpers<IDeliveryDetailsFormValues>
  ) => {
    const {order: checkoutDataOrder, total} = getCheckoutData() || {};
    if (!order || !checkoutDataOrder || !total) return;

    const updatedOrder: IOrderWithCustmAttr = {
      ...checkoutDataOrder,
      ...(hasRegularItems && {delivery_time: values.delivery_time}),
      ...(hasDropShipItems && {drop_ship_delivery_time: values.drop_ship_delivery_time}),
    };

    setLocalStorageCheckoutData({order: updatedOrder, total});
    dispatch(setOrder(updatedOrder));
    dispatch(addFilledStep({step: TCheckoutStep.deliveryDetails}));
    dispatch(setCurrentStep(TCheckoutStep.paymentMethod));
    setSubmitting(false);
  };

  const hasRegularItems = regularItems.length > 0;

  return {onSubmit, hasRegularItems, hasDropShipItems, dropShipItems, regularItems};
};

export default function DeliveryDetailsForm() {
  const {onSubmit, hasRegularItems, hasDropShipItems, dropShipItems, regularItems} = useSaveDeliveryDetails();
  const {order} = useAppSelector((state) => state.app);
  const {
    isLoading: loadingDeliveryTimes,
    isError: errorLoadingDeliveryTimes,
    data: deliveryTimes,
  } = useDeliveryTimes({returnTimeForTodayAndTwoDaysFromNow: hasDropShipItems});

  const initialValues: IDeliveryDetailsFormValues = {
    delivery_time: hasRegularItems ? (order?.delivery_time ?? "") : "",
    ...(hasDropShipItems && {drop_ship_delivery_time: order?.drop_ship_delivery_time ?? ""}),
  };

  const nextDayHelperText = deliveryTimes?.isNextDay
    ? "NOTE: Delivery is closed for the day; your order will be delivered tomorrow."
    : "";

  const dropShipDateLabel = hasDropShipTimes(deliveryTimes)
    ? deliveryTimes.dropShipTimes.date
    : "";

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={onSubmit}
      validate={makeValidateDeliveryDetailsForm(hasRegularItems, hasDropShipItems)}
      validateOnChange={false}
    >
      {(formikProps) => (
        <Form className={"bdl-delivery-details-form"}>
          <Typography variant="h5" sx={{mb: 2}}>
            {"Delivery details"}
          </Typography>

          {hasDropShipItems ? (
            <>
              {hasRegularItems && (
                <Box sx={{mb: 2}}>
                  <Typography variant="subtitle1" sx={{mb: 1, fontWeight: "bold"}}>
                    {"Delivery for:"}
                  </Typography>
                  <Typography variant="body2" sx={{mb: 1, fontWeight: "bold"}}>
                    {regularItems.map((item) => item.product.Name).join(", ")}
                  </Typography>
                  <TextField
                    required={true}
                    label="Delivery time"
                    variant={"outlined"}
                    fullWidth
                    select
                    slotProps={{select: {native: true}}}
                    helperText={nextDayHelperText}
                    {...fieldAttrs("delivery_time", formikProps)}
                  >
                    {renderDeliveryTimeOptions(deliveryTimes?.times, loadingDeliveryTimes, errorLoadingDeliveryTimes)}
                  </TextField>
                </Box>
              )}

              <Box sx={{mb: 2}}>
                <Typography variant="subtitle1" sx={{mb: 1, fontWeight: "bold"}}>
                  {"Delivery for:"}
                </Typography>
                <Typography variant="body2" sx={{mb: 1, fontWeight: "bold"}}>
                  {dropShipItems.map((item) => item.product.Name).join(", ")}
                </Typography>
                <TextField
                  required={true}
                  label="Delivery time"
                  variant={"outlined"}
                  fullWidth
                  select
                  slotProps={{select: {native: true}}}
                  helperText={dropShipDateLabel ? `Available from ${dropShipDateLabel}` : ""}
                  {...fieldAttrs("drop_ship_delivery_time", formikProps)}
                >
                  {renderDeliveryTimeOptions(
                    hasDropShipTimes(deliveryTimes) ? deliveryTimes.dropShipTimes.times : undefined,
                    loadingDeliveryTimes,
                    errorLoadingDeliveryTimes,
                  )}
                </TextField>
              </Box>
            </>
          ) : (
            <Box sx={{mb: 2}}>
              <TextField
                required={true}
                label="Delivery time"
                variant={"outlined"}
                fullWidth
                select
                slotProps={{select: {native: true}}}
                helperText={nextDayHelperText}
                {...fieldAttrs("delivery_time", formikProps)}
              >
                {renderDeliveryTimeOptions(deliveryTimes?.times, loadingDeliveryTimes, errorLoadingDeliveryTimes)}
              </TextField>
            </Box>
          )}

          <Box textAlign={"end"}>
            <Button
              variant="contained"
              startIcon={<DoneIcon />}
              type={"submit"}
              disabled={formikProps.isSubmitting}
              color="success"
              size="large"
            >
              {"Continue to payment"}
            </Button>
          </Box>
        </Form>
      )}
    </Formik>
  );
}
