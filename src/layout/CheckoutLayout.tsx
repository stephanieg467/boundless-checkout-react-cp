import React, {ReactNode} from "react";
import Container from "@mui/material/Container";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Grid from "@mui/material/Grid"; // Changed from Grid2
import Cart from "../components/Cart";
import LoadingLine from "../components/LoadingLine";
import CheckoutProgress from "../components/CheckoutProgress";

export default function CheckoutLayout({children}: {children: ReactNode | ReactNode[]}) {
	return (
        <section className={"bdl-checkout-layout"}>
            <LoadingLine />
            <Header />
            <main className={"bdl-checkout-layout__main"}>
				<Container className={"bdl-checkout-layout__container"}>
					<CheckoutProgress />
					<Grid container spacing={2}>
						<Grid
                            order={{xs: 2, sm: 1}}
                            size={{
                                md: 9,
                                sm: 8,
                                xs: 12
                            }}>
							{children}
						</Grid>
						<Grid
                            order={{xs: 1, sm: 2}}
                            size={{
                                md: 3,
                                sm: 4,
                                xs: 12
                            }}>
							<Cart />
						</Grid>
					</Grid>
				</Container>
			</main>
            <Footer />
            {/* Portal for date picker to ensure proper z-index layering */}
            <div id="date-picker-portal"></div>
        </section>
    );
}