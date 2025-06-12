export interface IMenuItem {
	title: string,
	url: string,
	isActive?: boolean,
	children?: IMenuItem[]
}