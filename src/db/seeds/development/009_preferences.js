import { preferences } from '../seeddata/PREFERENCES.js';

export const seed = async (knex) => {
	await knex('PREFERENCES').insert(preferences);
};
