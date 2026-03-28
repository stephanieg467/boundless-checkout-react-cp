import { Cart, CleanedCovaProduct, CovaCartItem } from "../types/cart";
export declare const covaProductPrice: (product: CleanedCovaProduct) => string;
export declare const isPromotionItem: (product: CleanedCovaProduct) => boolean;
export declare const cartPromotionItems: (cart: Cart) => CovaCartItem[];
export declare const cartHasTickets: () => boolean | undefined;
