import chai from 'chai';
import chaiHttp from 'chai-http';

import app from '../../src/app.js';
import knex, { test_teardown } from '../../src/db/knex.js';
import * as userStore from '../../src/db/userStore.js';
import jwt from '../../src/jwt/token.js';

import { after, afterEach, beforeEach, describe, it } from 'node:test';

const expect = chai.expect;

chai.use(chaiHttp);

const user_token = jwt.sign({
	userId: 1,
});

const token = jwt.sign({
	userId: 2,
});

after(async () => {
	await test_teardown();
});

describe('routes: admin users', () => {
	beforeEach(async () => {
		await knex.migrate.rollback();
		await knex.migrate.latest();
		await knex.seed.run();
	});

	afterEach(async () => {
		await knex.migrate.rollback();
	});

	describe('Fetching all users', () => {
		it('should return all users', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/users')
				.set('Authorization', 'Bearer ' + token);

			expect(res.status).to.equal(200);
		});
	});

	describe('Fetching user by id', () => {
		it('should return the user', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/users/1')
				.set('Authorization', 'Bearer ' + token);

			expect(res.status).to.equal(200);
		});

		it('should error on nonexistent user', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/users/77')
				.set('Authorization', 'Bearer ' + token);

			expect(res.status).to.equal(404);
			expect(res.body.error_code).to.equal('not_found');
		});
	});

	describe('Changing user password', () => {
		it('should change the password', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/1/changePassword')
				.set('Authorization', 'Bearer ' + token)
				.send({
					password: 'lol',
				});

			expect(res.status).to.equal(200);

			const res2 = await chai.request(app).post('/api/v1/authenticate').send({
				username: 'normal_user',
				password: 'lol',
			});

			expect(res2.status).to.equal(200);

			const token2 = jwt.verify(res2.body.accessToken);
			expect(token2.data.userId).to.exist;

			const user = await userStore.findByUsername('normal_user');
			expect(token2.data.userId).to.equal(user.userId);
		});

		it('should error on nonexistent user', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/99/changePassword')
				.set('Authorization', 'Bearer ' + token)
				.send({
					password: 'lol',
				});

			expect(res.status).to.equal(404);
			expect(res.body.error_code).to.equal('not_found');
		});

		it('should error on invalid parameters', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/1/changePassword')
				.set('Authorization', 'Bearer ' + token)
				.send({});

			expect(res.status).to.equal(400);
			expect(res.body.error_code).to.equal('bad_request');
		});

		it('should error if non-admin attempting to change password', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/1/changePassword')
				.set('Authorization', 'Bearer ' + user_token)
				.send({ password: 'lol' });

			expect(res.status).to.equal(403);
		});
	});

	describe('Changing user role', () => {
		it('should change the role', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/1/changeRole')
				.set('Authorization', 'Bearer ' + token)
				.send({
					role: 'ADMIN',
				});

			expect(res.status).to.equal(200);

			const updatedUser = await userStore.findById(1);
			expect(updatedUser.role).to.equal('ADMIN');
		});

		it('should return the new role', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/1/changeRole')
				.set('Authorization', 'Bearer ' + token)
				.send({
					role: 'ADMIN',
				});

			expect(res.status).to.equal(200);
		});

		it('should error on nonexistent user', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/99/changeRole')
				.set('Authorization', 'Bearer ' + token)
				.send({
					role: 'ADMIN',
				});

			expect(res.status).to.equal(404);
			expect(res.body.error_code).to.equal('not_found');
		});

		it('should error on invalid role', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/1/changeRole')
				.set('Authorization', 'Bearer ' + token)
				.send({
					role: 'abc',
				});

			expect(res.status).to.equal(400);
		});

		it('should error on invalid parameters', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/users/1/changeRole')
				.set('Authorization', 'Bearer ' + token)
				.send({});

			expect(res.status).to.equal(400);
			expect(res.body.error_code).to.equal('bad_request');
		});
	});

	describe("Fetching user's deposit history", async () => {
		it('should return list of deposits', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/users/1/depositHistory')
				.set('Authorization', 'Bearer ' + token);

			expect(res.status).to.equal(200);
		});
	});

	describe("Fetching user's purchase history", async () => {
		it('should return a list of purchases', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/users/1/purchaseHistory')
				.set('Authorization', 'Bearer ' + token);

			expect(res.status).to.equal(200);
		});
	});
});
