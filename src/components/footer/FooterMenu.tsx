import clsx from 'clsx';
import React from 'react';
import { IMenuItem } from '../../types/components';

export default function FooterMenu() {
	const baseUrl = process.env.BASE_URL || '';

	const menuListmenuList: IMenuItem[] = [
		{
			title: 'Home',
			url: baseUrl,
			isActive: false,
		},
		{
			title: 'Menu',
			url: baseUrl + 'menu',
			isActive: true,
		},
		// {
		// 	title: 'News & Events',
		// 	url: baseUrl + 'news-and-events',
		// 	isActive: false,
		// },
		{
			title: 'About',
			url: baseUrl + 'about-us',
			isActive: false,
		},
	];

	const menuListSecondary: IMenuItem[] = [
		{
			title: 'Privacy',
			url: '/privacy-policy',
			isActive: false,
		},
		{
			title: 'Refund',
			url: '/refund',
			isActive: false,
		},
		{
			title: 'Terms of Service',
			url: '/terms-of-service',
			isActive: false,
		},
	];

	return (
		<>
			<ul
				className='page-footer-menu list-unstyled'
				itemScope
				itemType='//schema.org/ItemList'
			>
				{menuListmenuList.map((item, i) => (
					<li
						className={clsx('page-footer-menu__list-element', {
							active: item.isActive,
						})}
						key={item.title + i}
					>
						<div
							itemProp='itemListElement'
							itemScope
							itemType='//schema.org/ListItem'
						>
							<ListElement item={item} position={i} />
						</div>
					</li>
				))}
			</ul>
			<ul
				className='page-footer-menu list-unstyled'
				itemScope
				itemType='//schema.org/ItemList'
			>
				{menuListSecondary.map((item, i) => (
					<li
						className={clsx('page-footer-menu__list-element', {
							active: item.isActive,
						})}
						key={item.title + i}
					>
						<div
							itemProp='itemListElement'
							itemScope
							itemType='//schema.org/ListItem'
						>
							<ListElement item={item} position={i} />
						</div>
					</li>
				))}
			</ul>
		</>
	);
}

function ListElement({
	item,
	position,
}: {
	item: IMenuItem;
	position: number;
}) {
	if (item.url)
		return (
			<>
				<a
					href={item.url}
					className={clsx('page-footer-menu__element is-link', {
						active: item.isActive,
					})}
				>
					<span className='title' itemProp='name'>
						{item.title}
					</span>
				</a>
				<meta itemProp='position' content={String(position + 1)} />
			</>
		);

	return (
		<div
			className={clsx('page-footer-menu__element', {active: item.isActive})}
		>
			<span className='page-footer-menu__text-title'>{item.title}</span>
		</div>
	);
}
