import {BoundlessClient, ICartItem, IOrderItem} from 'boundless-api-client';
import { IUseCartItems } from '../types/cart';
import { IImagePartial } from './images';

export interface IItemImage extends IImagePartial {
  use_original_path: boolean;
}

const itemImage = async (item: ICartItem | IOrderItem, api: BoundlessClient): Promise<IItemImage> => {
	const product = await api.catalog.getProduct(item.vwItem.product_id);
  if (product.props.arbitrary_data?.imageUri) {
    return {
      path: product.props.arbitrary_data?.imageUri,
      use_original_path: true,
    }
  }
  return {
    path: item.vwItem?.image?.path ?? '',
    use_original_path: false,
  };
}

async function addImagesToItems(
  items: ICartItem[] | IOrderItem[],
  api: BoundlessClient
): Promise<IUseCartItems[]> {
  const itemsPromises =
    items?.map((item) =>
      itemImage(item, api).then((image) => ({
        ...item,
        image,
      }))
    ) || [];
  const results = await Promise.allSettled(itemsPromises);
  const itemsImages = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<IUseCartItems>).value);

  return itemsImages;
}

export default addImagesToItems;
