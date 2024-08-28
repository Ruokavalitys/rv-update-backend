import express from 'express';
import { leaderboard } from '../db/userStore.js';
import { requireRvTerminalSecretMiddleware } from './authMiddleware.js';
const router = express.Router();

router.get('/leaderboard', requireRvTerminalSecretMiddleware(), async (_, res) => {
	const lb = await leaderboard();
	console.log(lb);
	res.json(lb);
});

export default router;
