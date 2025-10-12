export interface ICovaAddress {
	Id: string;
	CustomerId: string;
	AddressTypeId: number;
	AddressType: string;
	Default: boolean;
	DoNotContact: boolean;
	CountryCode: string;
	Country: string;
	Locality: string;
	StateCode: string;
	State: string;
	PostalCode: string;
	PostOfficeBoxNumber: string;
	StreetAddress1: string;
	StreetAddress2: string;
	Notes: string;
	Version: number;
	AttentionTo: string;
	Phone: string;
	Email: string;
}

export interface ICovaContactMethod {
	Value: string;
	Id: string;
	CustomerId: string;
	ContactMethodCategoryId: number;
	ContactMethodCategory: string;
	ContactMethodTypeId: number;
	ContactMethodType: string;
	DoNotContact: boolean;
	Default: boolean;
	Notes: string;
	Version: number;
}

export interface ICovaCustomer {
	Addresses: ICovaAddress[];
	ContactMethods: ICovaContactMethod[];
	CustomerExtensions: any[];
	RelatedCustomers: any[];
	MemberOf: any[];
	Documents: any[];
	MergedCustomers: any[];
	PrimaryName: string;
	Title: string;
	AlternateName: string;
	MiddleName: string;
	FamilyName: string;
	ReferralSource: string;
	Notes: string;
	UniqueIdentifier: string;
	Id: string;
	CustomerTypeId: number;
	CustomerType: string;
	DateOfBirth: string;
	PricingGroupId: string | null;
	Disabled: boolean;
	DoNotContact: boolean;
	Version: number;
	MergedIntoCustomerId: string | null;
	LastModifiedDateUtc: string;
}

export interface ISearchCriteria {
	Field: string;
	Operation: string;
	Criteria: string;
}

export interface ICovaCustomerSearchResponse {
	Id: number;
	Criteria: ISearchCriteria[];
	Results: ICovaCustomer[];
}
