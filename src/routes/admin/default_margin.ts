import express from 'express';
import { getPreference, preferences, setPreference } from '../../db/preferences.js';
import logger from '../../logger.js';
import authMiddleware, { type Authenticated_request } from '../authMiddleware.js';

const { GLOBAL_DEFAULT_MARGIN } = preferences;

const router = express.Router();

router.use(authMiddleware({ requiredRole: 'ADMIN', tokenSecret: process.env.JWT_SECRET }));

router.get('/', async (_req, res) => {
	const margin = await getPreference(GLOBAL_DEFAULT_MARGIN);
	res.status(200).json({ margin });
});

router.patch('/', async (req: Authenticated_request, res) => {
	await setPreference(GLOBAL_DEFAULT_MARGIN, req.body.margin);
	logger.info('User %s set current margin into %s', req.user.username, req.body.margin);
	res.status(200).send();
});

export default router;
