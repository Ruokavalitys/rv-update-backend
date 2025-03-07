import knex from './knex.js';

const rowToCategory = (row) => {
	if (row !== undefined) {
		return {
			categoryId: row.pgrpid,
			description: row.descr,
		};
	} else {
		return undefined;
	}
};

/**
 * Returns all categories.
 */
export const getCategories = async () => {
	const data = await knex('PRODGROUP').select('PRODGROUP.pgrpid', 'PRODGROUP.descr');
	return data.map(rowToCategory);
};

/**
 * Finds a category by its id.
 */
export const findById = async (categoryId) => {
	const row = await knex('PRODGROUP')
		.select('PRODGROUP.pgrpid', 'PRODGROUP.descr')
		.where({ pgrpid: categoryId })
		.first();
	return rowToCategory(row);
};

export const insertCategory = async (description) => {
	const insertedRows = await knex('PRODGROUP').insert({ descr: description }).returning(['pgrpid']);
	return {
		categoryId: insertedRows[0].pgrpid,
		description: description,
	};
};

export const updateCategory = async (categoryId, description) => {
	await knex('PRODGROUP').update({ descr: description }).where({ pgrpid: categoryId });
	return {
		categoryId: categoryId,
		description: description,
	};
};

export const deleteCategory = async (categoryId, moveProductsTo) => {
	const movedProductIdRows = await knex('RVITEM')
		.where('pgrpid', categoryId)
		.update({
			pgrpid: moveProductsTo,
		})
		.returning(['itemid']);

	const movedProductIds = movedProductIdRows.map((row) => row.itemid);

	const movedProducts = await knex('PRICE')
		.where('itemid', 'in', movedProductIds)
		.andWhere('endtime', null)
		.select('barcode');

	const rows = await knex('PRODGROUP').where({ pgrpid: categoryId }).update({ deleted: true }).returning(['descr']);

	if (rows.length === 0) {
		return undefined;
	}

	const row = rows[0];

	return {
		categoryId: Number.parseInt(categoryId),
		description: row.descr,
		movedProducts: movedProducts.map((row) => row.barcode),
	};
};
