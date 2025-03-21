import { deleteUndefinedFields } from '../utils/objectUtils.js';
import actions from './actions.js';
import knex from './knex.js';

const rowToBox = (row) => {
	if (row !== undefined) {
		return {
			boxBarcode: row.barcode,
			itemsPerBox: row.itemcount,
			product: {
				barcode: row.itembarcode,
				name: row.descr,
				category: {
					categoryId: row.pgrpid,
					description: row.pgrpdescr,
				},
				buyPrice: row.buyprice,
				sellPrice: row.sellprice,
				stock: row.count,
			},
		};
	} else {
		return undefined;
	}
};

/**
 * Return all boxes with match in barcode or item description
 */
export const searchBoxes = async (query) => {
	const data = await knex('RVBOX')
		.leftJoin('PRICE', 'RVBOX.itembarcode', 'PRICE.barcode')
		.leftJoin('RVITEM', 'PRICE.itemid', 'RVITEM.itemid')
		.leftJoin('PRODGROUP', 'RVITEM.pgrpid', 'PRODGROUP.pgrpid')
		.select(
			'RVBOX.barcode',
			'RVBOX.itemcount',
			'RVBOX.itembarcode',
			'RVITEM.descr',
			'RVITEM.pgrpid',
			'PRODGROUP.descr as pgrpdescr',
			'PRICE.buyprice',
			'PRICE.sellprice',
			'PRICE.count'
		)
		.where((queryBuilder) => {
			queryBuilder
				.whereILike('RVITEM.descr', `%${query}%`)
				.orWhereILike('PRICE.barcode', `%${query}%`)
				.orWhereILike('RVBOX.barcode', `%${query}%`);
		})
		.andWhere('PRICE.endtime', null);
	return data.map(rowToBox);
};

/**
 * Retrieves all boxes and their associated products.
 */
export const getBoxes = async (itembarcode?: string) => {
	let query = knex('RVBOX')
		.leftJoin('PRICE', 'RVBOX.itembarcode', 'PRICE.barcode')
		.leftJoin('RVITEM', 'PRICE.itemid', 'RVITEM.itemid')
		.leftJoin('PRODGROUP', 'RVITEM.pgrpid', 'PRODGROUP.pgrpid')
		.select(
			'RVBOX.barcode',
			'RVBOX.itemcount',
			'RVBOX.itembarcode',
			'RVITEM.descr',
			'RVITEM.pgrpid',
			'PRODGROUP.descr as pgrpdescr',
			'PRICE.buyprice',
			'PRICE.sellprice',
			'PRICE.count'
		)
		.where('PRICE.endtime', null);
	if (itembarcode) query = query.andWhere('RVBOX.itembarcode', itembarcode);
	const data = await query;
	return data.map(rowToBox);
};

/**
 * Finds a box by its barcode.
 */
export const findByBoxBarcode = async (boxBarcode) => {
	const row = await knex('RVBOX')
		.leftJoin('PRICE', 'RVBOX.itembarcode', 'PRICE.barcode')
		.leftJoin('RVITEM', 'PRICE.itemid', 'RVITEM.itemid')
		.leftJoin('PRODGROUP', 'RVITEM.pgrpid', 'PRODGROUP.pgrpid')
		.select(
			'RVBOX.barcode',
			'RVBOX.itemcount',
			'RVBOX.itembarcode',
			'RVITEM.descr',
			'RVITEM.pgrpid',
			'PRODGROUP.descr as pgrpdescr',
			'PRICE.buyprice',
			'PRICE.sellprice',
			'PRICE.count'
		)
		.where('PRICE.endtime', null)
		.andWhere('RVBOX.barcode', boxBarcode)
		.first();

	if (row === undefined) {
		return undefined;
	}

	return rowToBox(row);
};

/**
 * Creates a new box for a product.
 */
export const insertBox = async (boxData, userId) => {
	return await knex.transaction(async (trx) => {
		const now = new Date();
		await knex('RVBOX').transacting(trx).insert({
			barcode: boxData.boxBarcode,
			itembarcode: boxData.productBarcode,
			itemcount: boxData.itemsPerBox,
		});

		const productRow = await knex('PRICE')
			.transacting(trx)
			.leftJoin('RVITEM', 'PRICE.itemid', 'RVITEM.itemid')
			.leftJoin('PRODGROUP', 'RVITEM.pgrpid', 'PRODGROUP.pgrpid')
			.select(
				'RVITEM.descr',
				'RVITEM.pgrpid',
				'PRODGROUP.descr as pgrpdescr',
				'PRICE.buyprice',
				'PRICE.sellprice',
				'PRICE.count',
				'RVITEM.itemid'
			)
			.where('PRICE.barcode', boxData.productBarcode)
			.andWhere('PRICE.endtime', null)
			.first();

		await knex('BOXHISTORY').transacting(trx).insert({
			time: now,
			barcode: boxData.boxBarcode,
			itemid: productRow.itemid,
			itemcount: boxData.itemsPerBox,
			userid: userId,
			actionid: actions.BOX_CREATED,
		});

		return {
			boxBarcode: boxData.boxBarcode,
			itemsPerBox: boxData.itemsPerBox,
			product: {
				barcode: boxData.productBarcode,
				name: productRow.descr,
				category: {
					categoryId: productRow.pgrpid,
					description: productRow.pgrpdescr,
				},
				buyPrice: productRow.buyprice,
				sellPrice: productRow.sellprice,
				stock: productRow.count,
			},
		};
	});
};

export const updateBox = async (boxBarcode, boxData, userId) => {
	return await knex.transaction(async (trx) => {
		const now = new Date();

		const rvboxFields = deleteUndefinedFields({
			itembarcode: boxData.productBarcode,
			itemcount: boxData.itemsPerBox,
		});

		await knex('RVBOX').transacting(trx).update(rvboxFields).where({ barcode: boxBarcode });

		const boxRow = await knex('RVBOX')
			.transacting(trx)
			.leftJoin('PRICE', 'RVBOX.itembarcode', 'PRICE.barcode')
			.leftJoin('RVITEM', 'PRICE.itemid', 'RVITEM.itemid')
			.leftJoin('PRODGROUP', 'RVITEM.pgrpid', 'PRODGROUP.pgrpid')
			.select(
				'RVBOX.barcode',
				'RVBOX.itemcount',
				'RVBOX.itembarcode',
				'RVITEM.descr',
				'RVITEM.pgrpid',
				'PRODGROUP.descr as pgrpdescr',
				'PRICE.buyprice',
				'PRICE.sellprice',
				'PRICE.count',
				'RVITEM.itemid'
			)
			.where('PRICE.endtime', null)
			.andWhere('RVBOX.barcode', boxBarcode)
			.first();

		await knex('BOXHISTORY').transacting(trx).insert({
			time: now,
			barcode: boxRow.barcode,
			itemid: boxRow.itemid,
			itemcount: boxRow.itemcount,
			userid: userId,
			actionid: actions.CHANGED_BOX_ITEM_COUNT,
		});

		return rowToBox(boxRow);
	});
};

export const deleteBox = async (boxBarcode) => {
	return await knex.transaction(async (trx) => {
		const box = await knex('RVBOX')
			.transacting(trx)
			.leftJoin('PRICE', 'RVBOX.itembarcode', 'PRICE.barcode')
			.leftJoin('RVITEM', 'PRICE.itemid', 'RVITEM.itemid')
			.leftJoin('PRODGROUP', 'RVITEM.pgrpid', 'PRODGROUP.pgrpid')
			.select(
				'RVBOX.barcode',
				'RVBOX.itemcount',
				'RVBOX.itembarcode',
				'RVITEM.descr',
				'RVITEM.pgrpid',
				'PRODGROUP.descr as pgrpdescr',
				'PRICE.buyprice',
				'PRICE.sellprice',
				'PRICE.count'
			)
			.where({ 'RVBOX.barcode': boxBarcode, 'PRICE.endtime': null })
			.first();

		if (box === undefined) {
			return undefined;
		}

		await knex('RVBOX').transacting(trx).where({ barcode: boxBarcode }).delete();

		return rowToBox(box);
	});
};

export const buyIn = async (boxBarcode, boxCount, userId) => {
	return await knex.transaction(async (trx) => {
		const row = await knex('RVBOX')
			.transacting(trx)
			.leftJoin('PRICE', 'RVBOX.itembarcode', 'PRICE.barcode')
			.leftJoin('RVITEM', 'PRICE.itemid', 'RVITEM.itemid')
			.where({ 'RVBOX.barcode': boxBarcode, 'PRICE.endtime': null })
			.first('RVBOX.itemcount', 'PRICE.count', 'PRICE.barcode');

		if (row === undefined) {
			return undefined;
		}

		const { count, itemcount, barcode } = row;

		const newCount = count + itemcount * boxCount;

		const price_row = await knex('PRICE')
			.transacting(trx)
			.update({ count: newCount })
			.where({ 'PRICE.barcode': barcode, 'PRICE.endtime': null })
			.returning(['priceid', 'itemid']);

		await knex('ITEMHISTORY').transacting(trx).insert({
			time: new Date(),
			count: newCount,
			actionid: actions.PRODUCT_BUY_IN,
			itemid: price_row[0].itemid,
			userid: userId,
			priceid1: price_row[0].priceid,
		});

		return newCount;
	});
};
