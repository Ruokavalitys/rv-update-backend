import { rvitems } from './RVITEM.js';

function getRandomInteger(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export const itemhistory = [
	{
		itemhistid: 1,
		time: new Date('2018-12-24T00:00:00Z'),
		count: 101,
		itemid: 1750,
		userid: 1,
		actionid: 5,
		priceid1: 822,
		priceid2: null,
		saldhistid: 1,
	},
	{
		itemhistid: 2,
		time: new Date('2018-12-24T00:00:01Z'),
		count: 100,
		itemid: 1800,
		userid: 1,
		actionid: 5,
		priceid1: 877,
		priceid2: null,
		saldhistid: 2,
	},
	// admin changed sellprice
	{
		itemhistid: 3,
		time: new Date('2018-12-24T00:00:02Z'),
		count: 100,
		itemid: 1800,
		userid: 2,
		actionid: 7,
		priceid1: 877,
		priceid2: 899,
		saldhistid: null,
	},
	{
		itemhistid: 4,
		time: new Date('2018-12-24T00:00:05Z'),
		count: 101,
		itemid: 1756,
		userid: 1,
		actionid: 5,
		priceid1: 827,
		priceid2: null,
		saldhistid: 4,
	},
	// two different products bought at the same time
	{
		itemhistid: 5,
		time: new Date('2018-12-24T00:00:10Z'),
		count: 100,
		itemid: 1756,
		userid: 1,
		actionid: 5,
		priceid1: 827,
		priceid2: null,
		saldhistid: 6,
	},
	{
		itemhistid: 6,
		time: new Date('2018-12-24T00:00:10Z'),
		count: 100,
		itemid: 1750,
		userid: 1,
		actionid: 5,
		priceid1: 822,
		priceid2: null,
		saldhistid: 7,
	},
	// two same products bought at the same time
	{
		itemhistid: 7,
		time: new Date('2018-12-24T00:00:15Z'),
		count: 101,
		itemid: 1772,
		userid: 1,
		actionid: 5,
		priceid1: 847,
		priceid2: null,
		saldhistid: 9,
	},
	{
		itemhistid: 8,
		time: new Date('2018-12-24T00:00:15Z'),
		count: 100,
		itemid: 1772,
		userid: 1,
		actionid: 5,
		priceid1: 847,
		priceid2: null,
		saldhistid: 10,
	},
];


//Creates 5000 somewhat random itemhistory logs when container is recreated
const validItemIds = rvitems.map(item => item.itemid);

for (let i = itemhistory.length + 1; i <= 5008; i++) {
	const randomMonth = getRandomInteger(1,12)
	const randomDay = getRandomInteger(1,28)
    const randomItemId = validItemIds[getRandomInteger(0, validItemIds.length - 1)];

	itemhistory.push(
		{
			itemhistid: i,
			time: new Date('2018-12-24T00:00:15Z'),
			count: getRandomInteger(50,150),
			itemid: randomItemId,
			userid: getRandomInteger(1,3),
			actionid: 5,
			priceid1: 847,
			priceid2: null,
			saldhistid: 10,
		}
	);
}