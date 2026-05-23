declare module "merrco-payfirma-simple-pay-module" {
  export interface PayfirmaInputStyle {
    height?: string;
    width?: string;
    border?: string;
    margin?: string;
    "box-sizing"?: string;
    "text-align"?: string;
    "line-height"?: string;
    "font-size"?: string;
    background?: string;
    [key: string]: string | undefined;
  }

  export interface PayfirmaOptions {
    environment: string;
    style?: {
      input?: PayfirmaInputStyle;
    };
  }

  export default class PayfirmaIframeTransaction {
    constructor(apiKey: string, containerId: string, options: PayfirmaOptions);
  }
}