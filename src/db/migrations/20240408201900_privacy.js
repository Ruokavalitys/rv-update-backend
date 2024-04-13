export const up = async (knex) => {
	await knex.raw('ALTER TABLE "RVPERSON" ADD COLUMN IF NOT EXISTS "privacy_level" INTEGER');
	await knex.raw('ALTER TABLE "RVPERSON" ALTER COLUMN "privacy_level" SET DEFAULT 0');
	await knex.raw('ALTER TABLE "RVPERSON" ALTER COLUMN "privacy_level" SET NOT NULL');
};

export const down = async () => {};
