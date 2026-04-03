import React from "react";
import {TCheckoutStep} from "./types/common";
import {useAppSelector} from "./hooks/redux";
import useInitCheckoutByCart from "./hooks/initCheckout";
import ContactInfoPage from "./pages/ContactInfoPage";
import ShippingPage from "./pages/ShippingPage";
import DeliveryDetailsPage from "./pages/DeliveryDetailsPage";
import PaymentPage from "./pages/PaymentPage";
import Loading from "./components/Loading";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import {TClickedElement} from "./lib/elementEvents";
import {useTranslation} from "react-i18next";

const stepComponents: Partial<Record<TCheckoutStep, React.ComponentType>> = {
  [TCheckoutStep.contactInfo]: ContactInfoPage,
  [TCheckoutStep.shippingAddress]: ShippingPage,
  [TCheckoutStep.deliveryDetails]: DeliveryDetailsPage,
  [TCheckoutStep.paymentMethod]: PaymentPage,
};

export default function StepRenderer() {
  useInitCheckoutByCart();
  const {stepper, globalError, onHide} = useAppSelector((state) => state.app);
  const {t} = useTranslation();

  if (globalError) {
    return (
      <section className={"bdl-checkout-layout"}>
        <main className={"bdl-checkout-layout__main bdl-checkout-layout__main-v-center"}>
          <Container className={"bdl-checkout-layout__container"}>
            <Alert severity="error">
              <AlertTitle>{t("errorPage.error")}</AlertTitle>
              {globalError}
            </Alert>
            <Box sx={{mt: 2}} textAlign={"center"}>
              <Button
                variant="contained"
                size="large"
                onClick={() => onHide && onHide(TClickedElement.backToCart)}
                color="error"
              >
                {t("errorPage.backToSite")}
              </Button>
            </Box>
          </Container>
        </main>
      </section>
    );
  }

  if (!stepper) {
    return <Loading />;
  }

  const StepComponent = stepComponents[stepper.currentStep] ?? ContactInfoPage;
  return <StepComponent />;
}
