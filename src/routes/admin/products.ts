import express from 'express';
import * as categoryStore from '../../db/categoryStore.js';
import * as historyStore from '../../db/historyStore.js';
import * as productStore from '../../db/productStore.js';
import logger from '../../logger.js';
import { deleteUndefinedFields } from '../../utils/objectUtils.js';
import authMiddleware, { type Authenticated_request } from '../authMiddleware.js';

const router = express.Router();

router.use(authMiddleware({ requiredRole: 'ADMIN' }));

interface Products_requests extends Authenticated_request {
	product?: any;
}

router.param('barcode', async (req: Products_requests, res, next) => {
	const product = await productStore.findByBarcode(req.params.barcode);

	if (product === undefined) {
		res.status(404).json({
			error_code: 'not_found',
			message: `No product with barcode '${req.params.barcode}' found`,
		});

		logger.warn('User %s tried to access unknown product %s as admin', req.user.username, req.params.barcode);

		return;
	}

	req.product = product;

	next();
});

router.get('/', async (req: Products_requests, res) => {
	const user = req.user;

	try {
		const products = await productStore.getProducts();
		const mappedProds = products.map((product) => {
			return {
				barcode: product.barcode,
				name: product.name,
				category: {
					categoryId: product.category.categoryId,
					description: product.category.description,
				},
				buyPrice: product.buyPrice,
				sellPrice: product.sellPrice,
				stock: product.stock,
			};
		});

		logger.info('User %s fetched products as admin', user.username);
		res.status(200).json({
			products: mappedProds,
		});
	} catch (error) {
		logger.error('Error at %s %s: %s', req.method, req.originalUrl, error);
		res.status(500).json({
			error_code: 'internal_error',
			message: 'Internal error',
		});
	}
});

router.post('/', async (req: Products_requests, res) => {
	const user = req.user;
	const { barcode, name, categoryId, buyPrice, sellPrice, stock } = req.body;

	/* Checking if product already exists. */
	const existingProduct = await productStore.findByBarcode(barcode);
	if (existingProduct) {
		logger.warn('User %s failed to create new product, barcode %s was already taken', user.username, barcode);
		res.status(409).json({
			error_code: 'identifier_taken',
			message: 'Barcode already in use.',
		});
		return;
	}

	/* Checking if category exists. */
	const existingCategory = await categoryStore.findById(categoryId);
	if (!existingCategory) {
		logger.warn('User %s tried to create product of unknown category %s', user.username, categoryId);
		res.status(400).json({
			error_code: 'invalid_reference',
			message: 'Referenced category not found.',
		});
		return;
	}

	const newProduct = await productStore.insertProduct(
		{
			barcode,
			name,
			categoryId,
			buyPrice,
			sellPrice,
			stock,
		},
		user.userId
	);

	logger.info(
		'User %s created new product with data {barcode: %s, name: %s, categoryId: %s, buyPrice: %s, sellPrice: %s, stock: %s}',
		user.username,
		barcode,
		name,
		categoryId,
		buyPrice,
		sellPrice,
		stock
	);
	res.status(201).json({
		product: {
			barcode: newProduct.barcode,
			name: newProduct.name,
			category: {
				categoryId: newProduct.category.categoryId,
				description: newProduct.category.description,
			},
			buyPrice: newProduct.buyPrice,
			sellPrice: newProduct.sellPrice,
			stock: newProduct.stock,
		},
	});
});

router.get('/:barcode(\\d{1,14})', async (req: Products_requests, res) => {
	const user = req.user;
	const barcode = req.params.barcode;

	logger.info('User %s fetched product %s as admin', user.username, barcode);

	res.status(200).json({
		product: {
			barcode: req.product.barcode,
			name: req.product.name,
			category: {
				categoryId: req.product.category.categoryId,
				description: req.product.category.description,
			},
			buyPrice: req.product.buyPrice,
			sellPrice: req.product.sellPrice,
			stock: req.product.stock,
		},
	});
});

router.patch('/:barcode(\\d{1,14})', async (req: Products_requests, res) => {
	const user = req.user;
	const barcode = req.params.barcode;
	const { name, categoryId, buyPrice, sellPrice, stock } = req.body;

	/* Checking if category exists. */
	if (categoryId !== undefined) {
		const existingCategory = await categoryStore.findById(categoryId);
		if (!existingCategory) {
			logger.error(
				'User %s tried to modify category of product %s to unknown category %s',
				user.username,
				barcode,
				categoryId
			);
			res.status(400).json({
				error_code: 'invalid_reference',
				message: 'Referenced category not found.',
			});
			return;
		}
	}

	const updatedProduct = await productStore.updateProduct(
		barcode,
		deleteUndefinedFields({
			name,
			categoryId,
			buyPrice,
			sellPrice,
			stock,
		}),
		user.userId
	);

	logger.info(
		'User %s modified product data of product %s to ' +
			'{name: %s, categoryId: %s, buyPrice: %s, sellPrice: %s, stock: %s}',
		user.username,
		barcode,
		updatedProduct.name,
		updatedProduct.category.categoryId,
		updatedProduct.buyPrice,
		updatedProduct.sellPrice,
		updatedProduct.stock
	);

	res.status(200).json({
		product: {
			barcode: updatedProduct.barcode,
			name: updatedProduct.name,
			category: {
				categoryId: updatedProduct.category.categoryId,
				description: updatedProduct.category.description,
			},
			buyPrice: updatedProduct.buyPrice,
			sellPrice: updatedProduct.sellPrice,
			stock: updatedProduct.stock,
		},
	});
});

/* Disabled because of other endpoints misbehaving with deleted products.
See https://github.com/TKOaly/rv-backend/issues/69
router.delete('/:barcode(\\d{1,14})', async (req, res) => {
	const product = await productStore.deleteProduct(req.params.barcode);

	if (product === undefined) {
		res.status(404).json({
			error_code: 'not_found',
			message: `No product with barcode '${req.params.barcode}' found`,
		});

		return;
	}

	res.status(200).json({
		deletedProduct: product,
	});
});*/

router.post('/:barcode(\\d{1,14})/buyIn', async (req: Products_requests, res) => {
	const barcode = req.params.barcode;
	const { count, buyPrice, sellPrice } = req.body;

	const stock = await productStore.buyIn(barcode, count, req.user.userId);

	logger.info(
		"User %s bought in %d items of product '%s' (%s)",
		req.user.username,
		req.product.name,
		req.product.barcode
	);

	const update = {
		sellPrice: req.product.sellPrice !== sellPrice ? sellPrice : undefined,
		buyPrice: req.product.buyPrice !== buyPrice ? buyPrice : undefined,
	};

	const updatedProduct = await productStore.updateProduct(barcode, update, req.user.userId);

	if (update.sellPrice !== undefined || update.buyPrice !== undefined) {
		const changes = [];

		if (update.sellPrice !== undefined) {
			changes.push(`sellPrice from ${req.product.sellPrice} to ${update.sellPrice}`);
		}

		if (update.sellPrice !== undefined) {
			changes.push(`buyPrice from ${req.product.buyPrice} to ${update.buyPrice}`);
		}

		logger.info(
			"User %s changed %s on product '%s' (%s)",
			req.user.username,
			changes.join(' and '),
			req.product.name,
			req.product.barcode
		);
	}

	res.status(200).json({
		stock,
		buyPrice: updatedProduct.buyPrice,
		sellPrice: updatedProduct.sellPrice,
	});
});

router.get('/:barcode(\\d{1,14})/purchaseHistory', async (req: Products_requests, res) => {
	const barcode = req.params.barcode;
	const purchases = await historyStore.getProductPurchaseHistory(barcode);

	res.status(200).json({
		purchases: purchases.map((purchase) => {
			delete purchase.balanceAfter;
			// delete purchase.product; This doesn't exist on this object?
			return purchase;
		}),
	});
});

export default router;
