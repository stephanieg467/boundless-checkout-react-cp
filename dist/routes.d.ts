import { TCheckoutStep } from "boundless-api-client";
export declare const getPathByStep: (step: TCheckoutStep) => string;
export declare const getStepByPath: (path: string) => TCheckoutStep | undefined;
