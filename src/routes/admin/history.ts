import express from 'express';
import * as historyStore from '../../db/historyStore.js';
import authMiddleware from '../authMiddleware.js';

const router = express.Router();

router.use(authMiddleware({ requiredRole: 'ADMIN', tokenSecret: process.env.JWT_SECRET }));

router.get('/depositHistory', async (req, res) => {
	const limit: number = req.body.limit;
	const offset: number = req.body.offset;
	const history = await historyStore.getDepositHistory(offset, limit);

	res.status(200).json({
		deposits: history,
	});
});

router.get('/depositHistory/:depositId', async (req, res) => {
	const deposit = await historyStore.findDepositById(req.params.depositId);

	if (deposit === undefined) {
		res.status(404).json({
			error_code: 'not_found',
			message: `No deposit with id '${req.params.depositId}' found`,
		});

		return;
	}

	res.status(200).json({
		deposit,
	});
});

router.get('/purchaseHistory', async (req, res) => {
	const limit: number = req.body.limit;
	const offset: number = req.body.offset;
	const purchases = await historyStore.getPurchaseHistory(offset, limit);

	res.status(200).json({
		purchases,
	});
});

router.get('/purchaseHistory/:purchaseId', async (req, res) => {
	const purchase = await historyStore.findPurchaseById(req.params.purchaseId);

	if (purchase === undefined) {
		res.status(404).json({
			error_code: 'not_found',
			message: `No purchase event with ID '${req.params.purchaseId}' found`,
		});

		return;
	}

	res.status(200).json({
		purchase,
	});
});

export default router;
