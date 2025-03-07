import express from 'express';
import { getPreference, getPreferenceByKey, preferences, setPreference } from '../../db/preferences.js';
import logger from '../../logger.js';
import authMiddleware, { type Authenticated_request } from '../authMiddleware.js';

const router = express.Router();

router.use(authMiddleware({ requiredRole: 'ADMIN', tokenSecret: process.env.JWT_SECRET }));

router.get('/', async (_req, res) => {
	const values = await Promise.all(
		Object.values(preferences).map(async (preference) => ({
			key: preference.key,
			value: await getPreference(preference),
		}))
	);

	res.status(200).json({
		preferences: values,
	});
});

router.get('/:preferenceKey', async (req, res) => {
	const preference = getPreferenceByKey(req.params.preferenceKey);

	if (preference === undefined) {
		res.status(404).json({
			error_code: 'not_found',
			message: `No preference with key '${req.params.preferenceKey}' exists`,
		});

		return;
	}

	const value = await getPreference(preference);

	res.status(200).json({
		preference: {
			key: req.params.preferenceKey,
			value,
		},
	});
});

router.patch('/:preferenceKey', async (req: Authenticated_request, res) => {
	const preference = getPreferenceByKey(req.params.preferenceKey);

	if (preference === undefined) {
		res.status(404).json({
			error_code: 'not_found',
			message: `No preference with key '${req.params.preferenceKey}' exists`,
		});

		logger.info("User %s tried to set non-existent preference '%s'", req.user.username, req.params.preferenceKey);

		return;
	}

	const result = await setPreference(preference, req.body.value);

	if (result.errors.length > 0) {
		res.status(400).json({
			error_code: 'bad_request',
			message: 'Invalid preference value',
			errors: result.errors,
		});

		logger.info(
			"User %s tried to set an invalid value '%s' for preference '%s'",
			req.user.username,
			req.body.value,
			req.params.preferenceKey
		);

		return;
	}

	logger.info(
		"User %s changed preference '%s' from value '%s' to '%s'",
		req.user.username,
		result.previousValue,
		result.value
	);

	res.status(200).json({
		preference: {
			key: req.params.preferenceKey,
			value: result.value,
		},
	});
});

export default router;
