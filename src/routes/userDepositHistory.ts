import express from 'express';
import * as historyStore from '../db/historyStore.js';
import logger from '../logger.js';
import authMiddleware, { type Authenticated_request } from './authMiddleware.js';

const router = express.Router();

router.use(authMiddleware());

router.get('/', async (req: Authenticated_request, res) => {
	const user = req.user;

	try {
		const deposits = await historyStore.getUserDepositHistory(user.userId);
		const mappedDeposits = deposits.map((deposit) => {
			return {
				depositId: deposit.depositId,
				time: deposit.time,
				amount: deposit.amount,
				balanceAfter: deposit.balanceAfter,
			};
		});

		logger.info('User %s fetched deposit history', user.username);
		res.status(200).json({
			deposits: mappedDeposits,
		});
	} catch (error) {
		logger.error('Error at %s %s: %s', req.method, req.originalUrl, error);
		res.status(500).json({
			error_code: 'internal_error',
			message: 'Internal error',
		});
	}
});

router.get('/:depositId(\\d+)', async (req: Authenticated_request, res) => {
	const user = req.user;
	const depositId = Number.parseInt(req.params.depositId);

	try {
		const deposit = await historyStore.findDepositById(depositId);

		/* The ID may not be used for any deposit or may be used for a deposit of another user. */
		if (!deposit || deposit.user.userId !== user.userId) {
			logger.warn('User %s tried to fetch unknown deposit %s', user.username, depositId);
			res.status(404).json({
				error_code: 'not_found',
				message: 'Deposit event does not exist',
			});
			return;
		}

		logger.info('User %s fetched deposit %s', user.username, depositId);
		res.status(200).json({
			deposit: {
				depositId: deposit.depositId,
				time: deposit.time,
				amount: deposit.amount,
				balanceAfter: deposit.balanceAfter,
			},
		});
	} catch (error) {
		logger.error('Error at %s %s: %s', req.method, req.originalUrl, error);
		res.status(500).json({
			error_code: 'internal_error',
			message: 'Internal error',
		});
	}
});

export default router;
