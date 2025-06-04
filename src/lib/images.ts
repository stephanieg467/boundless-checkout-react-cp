export function getProductImg(image: IImagePartial, maxSize: number): IImageData {
	const {width, height, path} = image;
	
	return {
			src: path,
			width: width ?? undefined,
			height: height ?? undefined,
		};
}

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