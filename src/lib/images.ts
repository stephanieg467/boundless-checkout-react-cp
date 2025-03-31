import {BoundlessClient} from 'boundless-api-client';
import { IItemImage } from './addImagesToItems';

export function getProductImg(api: BoundlessClient, image: IItemImage, maxSize: number): IImageData {
	const {width, height, path: imgLocalPath} = image;
	const thumb = api.makeThumb({
		imgLocalPath,
		maxSize
	});

	if (!image.use_original_path && width && height) {
		thumb.setOriginalSize(width, height);

		return thumb.getAttrs();
	}

	if (image.use_original_path) {
		return {
			src: image.path,
			width: width ?? undefined,
			height: height ?? undefined,
			blurSrc: image.path
		};
	}

	return {src: thumb.getSrc()};
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