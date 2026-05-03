import React, {useEffect} from "react";
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
import {useCheckoutConfig} from "./contexts/CheckoutConfigContext";

const stepComponents: Partial<Record<TCheckoutStep, React.ComponentType>> = {
  [TCheckoutStep.contactInfo]: ContactInfoPage,
  [TCheckoutStep.shippingAddress]: ShippingPage,
  [TCheckoutStep.deliveryDetails]: DeliveryDetailsPage,
  [TCheckoutStep.paymentMethod]: PaymentPage,
};

const checkoutStepUrlSlugs: Partial<Record<TCheckoutStep, string>> = {
  [TCheckoutStep.contactInfo]: "info",
  [TCheckoutStep.shippingAddress]: "shipping",
  [TCheckoutStep.deliveryDetails]: "delivery-details",
  [TCheckoutStep.paymentMethod]: "payment",
};

const checkoutBasePath = "/checkout";

const syncCheckoutStepUrl = (step: TCheckoutStep) => {
  if (typeof window === "undefined") return;

  const slug = checkoutStepUrlSlugs[step];
  if (!slug) return;

  const nextPath = `${checkoutBasePath}/${slug}`;
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;

  if (window.location.pathname !== nextPath) {
    window.history.replaceState(window.history.state, "", nextUrl);
  }
};

export default function StepRenderer() {
  useInitCheckoutByCart();
  const {stepper, globalError} = useAppSelector((state) => state.app);
  const currentStep = stepper?.currentStep;
  const {onHide} = useCheckoutConfig();
  const {t} = useTranslation();

  useEffect(() => {
    document.querySelector<HTMLElement>(".bdl-checkout")?.scrollTo({top: 0, behavior: "smooth"});
  }, [currentStep]);

  useEffect(() => {
    if (currentStep) {
      syncCheckoutStepUrl(currentStep);
    }
  }, [currentStep]);

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
