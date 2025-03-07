import express from 'express';
import * as userStore from '../db/userStore.js';
import logger from '../logger.js';
import { deleteUndefinedFields } from '../utils/objectUtils.js';
import authMiddleware, { type Authenticated_request } from './authMiddleware.js';

const router = express.Router();

router.post('/user_exists', async (req: Authenticated_request, res) => {
	const username = req.body.username;
	const user = await userStore.findByUsername(username);
	if (user) {
		res.status(200).json({ exists: true });
	} else {
		res.status(200).json({ exists: false });
	}
});

router.use(authMiddleware());

router.get('/', async (req: Authenticated_request, res) => {
	const user = req.user;

	logger.info('User %s fetched user data', user.username);
	res.status(200).json({
		user: {
			userId: user.userId,
			username: user.username,
			fullName: user.fullName,
			email: user.email,
			moneyBalance: user.moneyBalance,
			role: user.role,
			privacyLevel: user.privacyLevel,
		},
	});
});

router.patch('/', async (req: Authenticated_request, res) => {
	const user = req.user;

	const username = req.body.username;
	const fullName = req.body.fullName;
	const email = req.body.email;

	// Check if user, email exists
	if (username !== undefined) {
		const userByUsername = await userStore.findByUsername(username);
		if (userByUsername) {
			logger.warn('User %s tried to change username to %s but it was taken', user.username, username);
			res.status(409).json({
				error_code: 'identifier_taken',
				message: 'Username already in use.',
			});
			return;
		}
	}
	if (email !== undefined) {
		const userByEmail = await userStore.findByEmail(email);
		if (userByEmail) {
			logger.warn(
				'User %s tried to change email from %s to %s but it was taken',
				user.username,
				user.email,
				email
			);
			res.status(409).json({
				error_code: 'identifier_taken',
				message: 'Email address already in use.',
			});
			return;
		}
	}

	const updatedUser = await userStore.updateUser(
		user.userId,
		deleteUndefinedFields({
			username: username,
			fullName: fullName,
			email: email,
		})
	);

	logger.info(
		'User %s changed user data from {%s, %s, %s} to {%s, %s, %s}',
		user.username,
		user.username,
		user.fullName,
		user.email,
		updatedUser.username,
		updatedUser.fullName,
		updatedUser.email
	);

	res.status(200).json({
		user: {
			userId: updatedUser.userId,
			username: updatedUser.username,
			fullName: updatedUser.fullName,
			email: updatedUser.email,
			moneyBalance: updatedUser.moneyBalance,
			role: updatedUser.role,
			privacyLevel: user.privacyLevel,
		},
	});
});

router.post('/deposit', authMiddleware({ rvTerminalRequired: true }), async (req: Authenticated_request, res) => {
	const user = req.user;
	const amount = req.body.amount;
	const type = req.body.type;

	const deposit = await userStore.recordDeposit(user.userId, amount, type);

	logger.info('User %s deposited %s cents', user.username, amount);
	res.status(200).json({
		accountBalance: deposit.balanceAfter,
		deposit: {
			depositId: deposit.depositId,
			time: deposit.time,
			amount: deposit.amount,
			balanceAfter: deposit.balanceAfter,
		},
	});
});

router.post('/changePrivacylevel', async (req: Authenticated_request, res) => {
	const user = req.user;
	const privacyLevel = req.body.privacyLevel;

	await userStore.updateUser(user.userId, { privacyLevel: privacyLevel });

	logger.info('User %s changed privacy level to %s', user.username, privacyLevel);
	res.status(204).end();
});

router.post('/changeRfid', async (req: Authenticated_request, res) => {
	const user = req.user;
	const rfid = req.body.rfid;

	const existing_user = await userStore.findByRfid(rfid);

	if (existing_user != undefined && existing_user.userId != user.userId) {
		logger.warn('User %s tried to change rfidbut it was already taken', user.username);
		res.status(409).json({
			error_code: 'identifier_taken',
			message: 'RFID already in use.',
		});
		return;
	}
	await userStore.updateUser(user.userId, { rfid: rfid });

	logger.info('User %s changed rfid', user.username);
	res.status(204).end();
});

router.post('/changePassword', async (req: Authenticated_request, res) => {
	const user = req.user;
	const password = req.body.password;

	await userStore.updateUser(user.userId, { password: password });

	logger.info('User %s changed password', user.username);
	res.status(204).end();
});

export default router;
