import express from 'express';
import { getPreference, preferences, setPreference } from '../../db/preferences.js';
import logger from '../../logger.js';
import authMiddleware, { type Authenticated_request } from '../authMiddleware.js';

const { GLOBAL_DEFAULT_MARGIN } = preferences;

const router = express.Router();

router.use(authMiddleware('ADMIN', process.env.JWT_ADMIN_SECRET));

router.get('/', async (_req, res) => {
	const margin = await getPreference(GLOBAL_DEFAULT_MARGIN);
	res.status(200).json({ margin });
});

router.patch('/', async (req: Authenticated_request, res) => {
	const result = await setPreference(GLOBAL_DEFAULT_MARGIN, req.body.margin);
	logger.info("User %s changed margin from '%s' to '%s'", req.user.username, result.previousValue, result.value);
	res.status(200).send();
});

export default router;
