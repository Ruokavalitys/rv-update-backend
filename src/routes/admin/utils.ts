import express from 'express';
import { findByUsername } from '../../db/userStore.js';
import type * as userStore from '../../db/userStore.js';
import logger from '../../logger.js';
import authMiddleware, { type Authenticated_request } from '../authMiddleware.js';

const router = express.Router();

router.use(authMiddleware({ requiredRole: 'ADMIN', tokenSecret: process.env.JWT_SECRET }));

interface Utils_request extends Authenticated_request {
	routeUser?: userStore.user;
}

router.get('/getUserByUsername/:username', async (req: Utils_request, res) => {
	const user = await findByUsername(req.params.username);
	logger.info('User %s fetched user with username %s as admin', req.user.username, req.params.username);
	if (user == undefined) {
		res.status(404).send();
		return;
	}
	res.status(200).json({ user: user });
});

export default router;
