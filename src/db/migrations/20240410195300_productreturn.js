export const up = async (knex) => {
	await knex.schema.alterTable('ITEMHISTORY', (table) => {
		table
			.integer('itemhistid2')
			.unique()
			.references('itemhistid')
			.inTable('ITEMHISTORY')
			.comment('Reference to the bought event that was returned in case of product return');
	});
};

export const down = async () => {};
