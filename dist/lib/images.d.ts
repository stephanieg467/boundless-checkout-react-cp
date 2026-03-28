export declare function getProductImg(image: IImagePartial, maxSize: number): IImageData;
export interface IImagePartial {
    path: string;
    width?: number | null;
    height?: number | null;
}
export interface IImageData {
    src: string;
    width?: number;
    height?: number;
    blurSrc?: string;
}
