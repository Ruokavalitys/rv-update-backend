import chai from 'chai';
import chaiHttp from 'chai-http';

import app from '../../src/app.js';
import * as boxStore from '../../src/db/boxStore.js';
import knex, { test_teardown } from '../../src/db/knex.js';
import jwt from '../../src/jwt/token.js';

import { after, afterEach, beforeEach, describe, it } from 'node:test';

const expect = chai.expect;

chai.use(chaiHttp);

const adminToken = jwt.sign(
	{
		userId: 2,
	},
	process.env.JWT_SECRET
);
const userToken = jwt.sign({
	userId: 1,
});

after(async () => {
	await test_teardown();
});

describe('routes: admin boxes', () => {
	beforeEach(async () => {
		await knex.migrate.rollback();
		await knex.migrate.latest();
		await knex.seed.run();
	});

	afterEach(async () => {
		await knex.migrate.rollback();
	});

	describe('Fetching all boxes', () => {
		it('should return all boxes', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(res.status).to.equal(200);
		});
		it('should return only boxes related to certain item barcode if queried with itembarcode', async () => {
			const itembarcode = '4740098010166';
			const res = await chai
				.request(app)
				.get('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({ itembarcode: itembarcode });
			expect(res.body.boxes.length).to.equal(5);
			expect(res.body.boxes[0].product.barcode).to.equal(itembarcode);
			expect(res.body.boxes[1].product.barcode).to.equal(itembarcode);
			expect(res.body.boxes[2].product.barcode).to.equal(itembarcode);
			expect(res.body.boxes[3].product.barcode).to.equal(itembarcode);
			expect(res.body.boxes[4].product.barcode).to.equal(itembarcode);
			expect(res.status).to.equal(200);
		});
	});

	describe('Searching boxes', () => {
		it('should return product barcode matching box if found', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/search')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({ query: '4740098010166' });
			expect(res.status).to.equal(200);
			expect(res.body.boxes.length).to.equal(5);
		});
		it('should return box barcode matching box if found', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/search')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({ query: '8810337568652' });
			expect(res.status).to.equal(200);
			expect(res.body.boxes.length).to.equal(1);
		});
		it('should return product name matching box if found', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/search')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({ query: 'A. Le Coq' });
			expect(res.status).to.equal(200);
			expect(res.body.boxes.length).to.equal(5);
		});
		it('should return no matching product if not found', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/search')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({ query: 'motivaatio' });
			expect(res.status).to.equal(200);
			expect(res.body.boxes.length).to.equal(0);
		});

		it('should not be called by unprivileged user', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + userToken);

			expect(res.status).to.equal(403);
			expect(res.body.error_code).to.equal('not_authorized');
		});

		it('should not be called without authentication', async () => {
			const res = await chai.request(app).get('/api/v1/admin/boxes');

			expect(res.status).to.equal(401);
			expect(res.body.error_code).to.equal('invalid_token');
		});
	});

	describe('Fetching box by barcode', () => {
		it('should return the box', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01766752')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(res.status).to.equal(200);
		});

		it('should return 404 on nonexistent box', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/00000000')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(res.status).to.equal(404);
			expect(res.body.error_code).to.equal('not_found');
		});

		it('should not be called by unprivileged user', async () => {
			const res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01766752')
				.set('Authorization', 'Bearer ' + userToken);

			expect(res.status).to.equal(403);
			expect(res.body.error_code).to.equal('not_authorized');
		});

		it('should not be called without authentication', async () => {
			const res = await chai.request(app).get('/api/v1/admin/boxes/01766752');

			expect(res.status).to.equal(401);
			expect(res.body.error_code).to.equal('invalid_token');
		});
	});

	describe('Creating new box', () => {
		it('should create new box', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxBarcode: '12345678',
					itemsPerBox: 3,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(201);

			const newBox = await boxStore.findByBoxBarcode('12345678');
			expect(newBox).to.exist;
			expect(newBox.boxBarcode).to.equal('12345678');
			expect(newBox.itemsPerBox).to.equal(3);
			expect(newBox.product.barcode).to.equal('6415600540889');
		});

		it('should return the new box', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxBarcode: '12345678',
					itemsPerBox: 3,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(201);

			const newBox = res.body.box;
			expect(newBox).to.exist;
			expect(newBox.boxBarcode).to.equal('12345678');
			expect(newBox.itemsPerBox).to.equal(3);
			expect(newBox.product.barcode).to.equal('6415600540889');
		});

		it('should error if box barcode is already taken', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxBarcode: '01880335',
					itemsPerBox: 3,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(409);
			expect(res.body.error_code).to.equal('identifier_taken');
		});

		it('should error on nonexistent product', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxBarcode: '12345678',
					itemsPerBox: 2,
					productBarcode: '00000000',
				});

			expect(res.status).to.equal(400);
			expect(res.body.error_code).to.equal('invalid_reference');
		});

		it('should error on invalid parameters', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxBarcode: '',
					itemsPerBox: 2,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(400);
			expect(res.body.error_code).to.equal('bad_request');
		});

		it('should not be called by unprivileged user', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					boxBarcode: '12345678',
					itemsPerBox: 3,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(403);
			expect(res.body.error_code).to.equal('not_authorized');
		});

		it('should not be called without authentication', async () => {
			const res = await chai.request(app).post('/api/v1/admin/boxes').send({
				boxBarcode: '12345678',
				itemsPerBox: 3,
				productBarcode: '6415600540889',
			});

			expect(res.status).to.equal(401);
			expect(res.body.error_code).to.equal('invalid_token');
		});
	});

	describe('Modifying box data', () => {
		it('should modify the box', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					itemsPerBox: 6,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(200);

			const updatedBox = await boxStore.findByBoxBarcode('01880335');
			expect(updatedBox).to.exist;
			expect(updatedBox.itemsPerBox).to.equal(6);
			expect(updatedBox.product.barcode).to.equal('6415600540889');
		});

		it('should allow modifying only some fields', async () => {
			const originalBox = await boxStore.findByBoxBarcode('01880335');

			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(200);

			const updatedBox = await boxStore.findByBoxBarcode('01880335');
			expect(updatedBox).to.exist;
			expect(updatedBox.product.barcode).to.equal('6415600540889');
			expect(updatedBox.itemsPerBox).to.equal(originalBox.itemsPerBox);
		});

		it('should return the updated box', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					itemsPerBox: 49,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(200);

			const updatedBox = res.body.box;
			expect(updatedBox).to.exist;
			expect(updatedBox.itemsPerBox).to.equal(49);
			expect(updatedBox.product.barcode).to.equal('6415600540889');
		});

		it('should error on nonexistent box', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/88888888')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					itemsPerBox: 3,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(404);
			expect(res.body.error_code).to.equal('not_found');
		});

		it('should error on nonexistent product', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					itemsPerBox: 6,
					productBarcode: '55555555',
				});

			expect(res.status).to.equal(400);
			expect(res.body.error_code).to.equal('invalid_reference');
		});

		it('should error on invalid parameters', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					itemsPerBox: -1,
					productBarcode: '6415600540889',
				});

			expect(res.status).to.equal(400);
			expect(res.body.error_code).to.equal('bad_request');
		});

		it('should error on unknown fields', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					abcd: -1,
				});

			expect(res.status).to.equal(400);
			expect(res.body.error_code).to.equal('bad_request');
		});

		it('should not be called by unprivileged user', async () => {
			const res = await chai
				.request(app)
				.patch('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					itemsPerBox: 6,
					productBarcode: 'R6415600540889',
				});

			expect(res.status).to.equal(403);
			expect(res.body.error_code).to.equal('not_authorized');
		});

		it('should not be called without authentication', async () => {
			const res = await chai.request(app).patch('/api/v1/admin/boxes/01880335').send({
				itemsPerBox: 6,
				productBarcode: '6415600540889',
			});

			expect(res.status).to.equal(401);
			expect(res.body.error_code).to.equal('invalid_token');
		});
	});

	describe('Deleting a box', () => {
		it('should delete the box', async () => {
			let res = await chai
				.request(app)
				.delete('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(res.status).to.equal(200);

			res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(res.status).to.equal(404);

			const deletedBox = await boxStore.findByBoxBarcode('01880335');
			expect(deletedBox).to.not.exist;
		});

		it('should error on nonexistent box', async () => {
			const res = await chai
				.request(app)
				.delete('/api/v1/admin/boxes/88888888')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(res.status).to.equal(404);
			expect(res.body.error_code).to.equal('not_found');
		});

		it('should return the deleted box', async () => {
			const originalBox = await boxStore.findByBoxBarcode('01880335');

			const res = await chai
				.request(app)
				.delete('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(res.status).to.equal(200);

			const deletedBox = res.body.deletedBox;
			expect(deletedBox).to.exist;
			expect(deletedBox.product.barcode).to.equal(originalBox.product.barcode);
			expect(deletedBox.itemsPerBox).to.equal(originalBox.itemsPerBox);
		});

		it('should not be called by unprivileged user', async () => {
			const res = await chai
				.request(app)
				.delete('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + userToken);

			expect(res.status).to.equal(403);
			expect(res.body.error_code).to.equal('not_authorized');
		});

		it('should not be called without authentication', async () => {
			const res = await chai.request(app).delete('/api/v1/admin/boxes/01880335');

			expect(res.status).to.equal(401);
			expect(res.body.error_code).to.equal('invalid_token');
		});
	});

	describe('Buy-in of boxes', () => {
		it('should fail on nonexisting boxes', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/88888888/buyIn')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxCount: 1,
					productBuyPrice: 1,
					productSellPrice: 1,
				});

			expect(res.status).to.equal(404);
		});

		it('should not update the number of other items', async () => {
			const initial_res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(initial_res.status).to.equal(200);

			const { buyPrice, sellPrice, stock } = initial_res.body.box.product;
			const itemsPerBox = initial_res.body.box.itemsPerBox;

			const post_res1 = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01766752')
				.set('Authorization', 'Bearer ' + adminToken);
			expect(post_res1.status).to.equal(200);

			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/01880335/buyIn')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxCount: 1,
					productBuyPrice: buyPrice,
					productSellPrice: sellPrice,
				});

			expect(res.status).to.equal(200);
			expect(res.body.productStock).to.equal(stock + itemsPerBox);

			const post_res2 = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01766752')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(post_res2.status).to.equal(200);
			expect(post_res1.body.box.product.stock).to.equal(post_res2.body.box.product.stock);
		});

		it('should fail on invalid request', async () => {
			const validFields = {
				boxCount: 1,
				productBuyPrice: 1,
				productSellPrice: 1,
			};

			for (const missingField in validFields) {
				const invalidRequest = { ...validFields };
				delete invalidRequest[missingField];

				const res = await chai
					.request(app)
					.post('/api/v1/admin/boxes/01880335/buyIn')
					.set('Authorization', 'Bearer ' + adminToken)
					.send(invalidRequest);

				expect(res.status).to.equal(400, `request should fail when field ${missingField} is not defined`);
			}

			for (const negativeField in validFields) {
				const invalidRequest = { ...validFields };
				invalidRequest[negativeField] = -1;

				const res = await chai
					.request(app)
					.post('/api/v1/admin/boxes/01880335/buyIn')
					.set('Authorization', 'Bearer ' + adminToken)
					.send(invalidRequest);

				expect(res.status).to.equal(400, `request should fail when field ${negativeField} is negative`);
			}
		});

		it('should update the number of items', async () => {
			const initial_res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(initial_res.status).to.equal(200);

			const { buyPrice, sellPrice, stock } = initial_res.body.box.product;
			const itemsPerBox = initial_res.body.box.itemsPerBox;

			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/01880335/buyIn')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxCount: 1,
					productBuyPrice: buyPrice,
					productSellPrice: sellPrice,
				});

			expect(res.status).to.equal(200);
			expect(res.body.productStock).to.equal(stock + itemsPerBox);

			const post_res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(post_res.status).to.equal(200);
			expect(post_res.body.box.product.stock).to.equal(stock + itemsPerBox);
		});

		it('should update the sell and buy prices of the product', async () => {
			const initial_res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(initial_res.status).to.equal(200);

			const { buyPrice, sellPrice } = initial_res.body.box.product;

			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/01880335/buyIn')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					boxCount: 1,
					productBuyPrice: buyPrice + 1,
					productSellPrice: sellPrice + 1,
				});

			expect(res.status).to.equal(200);

			const post_res = await chai
				.request(app)
				.get('/api/v1/admin/boxes/01880335')
				.set('Authorization', 'Bearer ' + adminToken);

			expect(post_res.status).to.equal(200);
			expect(post_res.body.box.product.sellPrice).to.equal(
				sellPrice + 1,
				"product's sellPrice should have changed"
			);
			expect(post_res.body.box.product.buyPrice).to.equal(buyPrice + 1, "product's buyPrice should have changed");
		});

		it('should not be called by unprivileged user', async () => {
			const res = await chai
				.request(app)
				.post('/api/v1/admin/boxes/01880335/buyIn')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					boxCount: 1,
					productBuyPrice: 50,
					productSellPrice: 51,
				});

			expect(res.status).to.equal(403);
			expect(res.body.error_code).to.equal('not_authorized');
		});

		it('should not be called without authentication', async () => {
			const res = await chai.request(app).post('/api/v1/admin/boxes/01880335/buyIn').send({
				boxCount: 1,
				productBuyPrice: 50,
				productSellPrice: 51,
			});

			expect(res.status).to.equal(401);
			expect(res.body.error_code).to.equal('invalid_token');
		});
	});
});
