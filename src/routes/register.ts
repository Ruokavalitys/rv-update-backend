import express from 'express';
import * as userStore from '../db/userStore.js';
import logger from './../logger.js';
import { requireRvTerminalSecretMiddleware } from './authMiddleware.js';

const router = express.Router();

// Register a new user
router.post('/', requireRvTerminalSecretMiddleware(), async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	const fullName = req.body.fullName;
	const email = req.body.email;

	// Check if user, email exists
	const userByUsername = await userStore.findByUsername(username);
	if (userByUsername) {
		logger.warn('Failed to register new user, username %s was already taken', username);
		res.status(409).json({
			error_code: 'identifier_taken',
			message: 'Username already in use.',
		});
		return;
	}
	const userByEmail = await userStore.findByEmail(email);
	if (userByEmail) {
		logger.warn('Failed to register new user, email %s was already taken', email);
		res.status(409).json({
			error_code: 'identifier_taken',
			message: 'Email address already in use.',
		});
		return;
	}

	// Add user to db
	const newUser = await userStore.insertUser({
		username,
		password,
		fullName,
		email,
	});

	logger.info('Registered new user: %s', username);
	res.status(201).json({
		user: {
			userId: newUser.userId,
			username: newUser.username,
			fullName: newUser.fullName,
			email: newUser.email,
			moneyBalance: newUser.moneyBalance,
			role: newUser.role,
			privacyLevel: newUser.privacyLevel,
		},
	});
});

export default router;
