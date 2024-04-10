import chai from 'chai';
import chaiHttp from 'chai-http';

import app from '../../src/app.js';
import knex, { test_teardown } from '../../src/db/knex.js';
import jwt from '../../src/jwt/token.js';

import { after, afterEach, beforeEach, describe, it } from 'node:test';

const expect = chai.expect;

chai.use(chaiHttp);

const token = jwt.sign(
	{
		userId: 2,
	},
	process.env.JWT_ADMIN_SECRET
);

after(async () => {
	await test_teardown();
});

describe('routes: admin default_margin', () => {
	beforeEach(async () => {
		await knex.migrate.rollback();
		await knex.migrate.latest();
		await knex.seed.run();
	});

	afterEach(async () => {
		await knex.migrate.rollback();
	});

	describe('querying a margin', () => {
		it('should return default margin', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/defaultMargin')
				.set('Authorization', 'Bearer ' + token);

			expect(res.status).to.equal(200);
			expect(res.body.margin).to.equal(0.05);
		});
	});

	describe('setting a margin', () => {
		it('should cause queries to resolve with the new value', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/defaultMargin')
				.set('Authorization', 'Bearer ' + token)
				.send({
					margin: 0.25,
				});

			expect(res.status).to.equal(200);

			const post_res = await chai
				.request(app)
				.get('/api/v1/admin/defaultMargin')
				.set('Authorization', 'Bearer ' + token);

			expect(post_res.status).to.equal(200);
			expect(post_res.body.margin).to.equal(0.25);
		});

		it('should fail when setting an invalid value', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/defaultMargin')
				.set('Authorization', 'Bearer ' + token)
				.send({
					margin: 'asd',
				});

			expect(res.status).to.equal(400);
		});
	});
});
