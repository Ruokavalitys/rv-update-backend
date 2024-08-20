import type { Request } from 'express';
import * as userStore from '../db/userStore.js';
import jwt from '../jwt/token.js';
import logger from '../logger.js';
import { verifyRole } from './authUtils.js';

export interface Authenticated_request extends Request {
	user?: userStore.user;
}

const authMiddleware = ({
	requiredRole = null,
	tokenSecret = process.env.JWT_SECRET,
	rvTerminalRequired = false,
}: { requiredRole?: string; tokenSecret?: string; rvTerminalRequired?: boolean } = {}) => {
	return async (req, res, next) => {
		const authHeader = req.get('Authorization');
		let userId = null;
		let loggedInFromRvTerminal = false;

		// verify that Authorization header contains a token
		if (authHeader !== undefined) {
			const parts = authHeader.split(' ');
			if (parts.length == 2 && parts[0] == 'Bearer') {
				const token = jwt.verify(parts[1], tokenSecret);

				if (token) {
					userId = token.data.userId;
					loggedInFromRvTerminal = token.data.loggedInFromRvTerminal;
				}
			}
		}

		if (userId !== null) {
			try {
				const user = await userStore.findById(userId);

				if (user) {
					// finally, verify that user is authorized
					if (verifyRole(requiredRole, user.role)) {
						if (!rvTerminalRequired || loggedInFromRvTerminal) {
							logger.info(
								'User %s successfully authenticated for %s %s',
								user.username,
								req.method,
								req.originalUrl
							);
							req.user = user;
							next();
						} else {
							logger.warn(
								'User %s is not authorized for %s %s, login from rvTerminal required for the route',
								user.username,
								req.method,
								req.originalUrl
							);
							res.status(403).json({
								error_code: 'not_authorized',
								message: 'Not authorized',
							});
						}
					} else {
						logger.warn(
							'User %s is not authorized for %s %s, missing role %s',
							user.username,
							req.method,
							req.originalUrl,
							requiredRole
						);
						res.status(403).json({
							error_code: 'not_authorized',
							message: 'Not authorized',
						});
					}
				} else {
					// token contains nonexistent user or no roles
					logger.warn('Invalid authorization token (token contains nonexistent user or no roles)');
					res.status(401).json({
						error_code: 'invalid_token',
						message: 'Invalid authorization token',
					});
				}
			} catch (error) {
				logger.error('Error at %s %s: %s', req.method, req.originalUrl, error);
				res.status(500).json({
					error_code: 'internal_error',
					message: 'Internal error',
				});
			}
		} else {
			// no username in token
			logger.warn('Invalid authorization token (no username in token)');
			res.status(401).json({
				error_code: 'invalid_token',
				message: 'Invalid authorization token',
			});
		}
	};
};

export default authMiddleware;
