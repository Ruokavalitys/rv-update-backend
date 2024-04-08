export const up = async (knex) => {
	await knex.raw('ALTER TABLE "RVPERSON" ADD COLUMN "privacy_level" INTEGER NOT NULL DEFAULT 0');
};

export const down = async () => {};
