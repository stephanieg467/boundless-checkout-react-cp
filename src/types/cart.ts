import { ICurrency, ILocaleSettings, ICustomer, ICheckoutStepper, ITotal } from "boundless-api-client";
import { IOrderWithCustmAttr } from "./Order";

export interface CovaProduct {
	ProductId: string;
	MasterProductId: number;
	MasterProductName: string;
	VariationId: null | number;
	Slug: string;
	CatalogSku: string;
	IsArchived: boolean;
	MeasurementType: string;
	IsBatchTracked: boolean;
	IsNonStock: boolean;
	LifeCycle: string;
	ClassificationId: number;
	ClassificationName: string;
	ClassificationPath: string;
	Name: string;
	ShortDescription: string;
	LongDescription: string;
	HeroShotAssetId: string;
	HeroShotUri: string;
	SupplierSkus: Array<{
		SKU: string;
		SupplierId: number;
		Supplier: string;
		Description: string;
	}>;
	ManufacturerSkus: Array<any>;
	Upcs: Array<any>;
	ProductSpecifications: Array<{
		Unit: string;
		Value: string;
		DisplayName: string;
	}>;
	Assets: Array<{
    Id: string;
    Name: string;
    Uri: string;
    Type: string;
    IsHidden: boolean;
  }>;
	Availability: Array<{
		LocationId: number;
		RoomId: number;
		PackageId: string;
		BatchId: string;
		UnitId: number;
		InStockQuantity: number;
		OnOrderQuantity: number;
		TransferInQuantity: number;
		TransferOutQuantity: number;
		TotalCostInStock: number;
		UnitCost: number;
		ReceivedDate: string;
		UpdatedDateUtc: string;
		IsSellingRoom: boolean;
	}>;
	Prices: Array<{
		LocationId: number;
		FromEntityId: number;
		ProductId: string;
		TierId: null | number;
		TierName: null | string;
		TierQuantity: null | number;
		GroupId: null | number;
		GroupName: null | string;
		ShelfId: null | number;
		ShelfName: null | string;
		Price: number;
		AtTierPrice: null | number;
		SalePrices: Array<any>;
		UpdatedDateUtc: string;
	}>;
  discountedPrice?: string;
  discount?: number;
	CreatedDateUtc: string;
	UpdatedDateUtc: string;
	ApplicableTaxRates: Array<string>;
	ClassificationTreeId: number;
	ManufacturerId: null | number;
	Manufacturer: null | string;
	MSRP: null | number;
	MSRPCurrencyCode: null | string;
	CompanyLevelRegularPrice: {
		Price: number;
		SalePrices: Array<any>;
	};
}

export interface CovaCartItem {
  product: CovaProduct;
  qty: number;
  originalQty?: number;
  total: string;
  thcGrams?: number | null;
}

export interface CovaCheckoutInitData {
		items: CovaCartItem[];
		order: IOrderWithCustmAttr;
		currency: ICurrency;
		localeSettings: ILocaleSettings;
		loggedInCustomer: ICustomer | null;
		hasCouponCampaigns: boolean;
		stepper: ICheckoutStepper;
		total: ITotal;
}
