import actions from '../actions.js';

export const up = async (knex) => {
	const itemhistory = await knex('ITEMHISTORY').select('saldhistid').where('actionid', actions.BOUGHT_BY);
	const saldohistory = await knex('SALDOHISTORY').select('saldhistid', 'time', 'userid').orderBy(['time', 'userid']);
	const personhist = await knex('PERSONHIST')
		.select('pershistid', 'time', 'userid1')
		.where('actionid', actions.DEPOSITED_MONEY)
		.orderBy(['time', 'userid1']);

	/* Saldo event ids that have already been associated with an item event. */
	const connectedSaldoIds = new Set(itemhistory.map((itemEvent) => itemEvent.saldhistid));

	/* Retaining only saldo events that have not yet been connected. This contains saldo events of deposits and some
	 * trash saldo events that don't connect to anything. */
	const unconnectedSaldoEvents = saldohistory.filter((saldoEvent) => !connectedSaldoIds.has(saldoEvent.saldhistid));

	/* Iterating through all deposits and connecting them to matching saldo events. Every deposit event has a matching
	 * saldo event, but not all saldo events are related to deposits.
	 *
	 * This algorithm assumes that:
	 * - There is no more than one deposit event per second.
	 *   - This is a sensible assumption because the old RV is only one machine and it requires user input on every
	 *     deposit.
	 * - Its matching saldo event has either the same timestamp or one second later.
	 *   - This is just based on empirical observation, and may be wrong in the future.
	 *
	 * The datasets are ordered by the same columns, so it is guaranteed that the deposit events and matching saldo
	 * events are encountered in the same order. This allows using the two pointers technique for performance
	 * optimization. */
	let depositIndex = 0;
	let saldoIndex = 0;
	while (depositIndex < personhist.length) {
		const depositEvent = personhist[depositIndex];
		const depositTime = Date.parse(depositEvent.time);

		/* First skipping trash saldo events with times earlier than the deposit time. */
		while (Date.parse(unconnectedSaldoEvents[saldoIndex].time) < depositTime) {
			saldoIndex++;
		}

		// Consider the next 10 saldo events just to be safe with ordering.
		// In production data there are cases where multiple saldo events are at the same time,
		// with the deposit event being sorted _after_ a saldo event pertaining to a user with a lower id.
		for (let i = 0; i < 10; i++) {
			const saldoEvent = unconnectedSaldoEvents[saldoIndex + i];

			if (Date.parse(saldoEvent.time) - depositTime <= 1000 && saldoEvent.userid === depositEvent.userid1) {
				depositEvent.saldhistid = saldoEvent.saldhistid;
				saldoIndex++;
				depositIndex++;
				break;
			}
		}

		if (!depositEvent.saldhistid) {
			throw new Error(
				`There was no matching saldo event for deposit event ${JSON.stringify(
					depositEvent
				)}, was considering the following saldo events: ${JSON.stringify([
					...unconnectedSaldoEvents.slice(saldoIndex, saldoIndex + 10),
				])}.`
			);
		}
	}

	await knex.schema.table('PERSONHIST', (table) => {
		table.integer('saldhistid').references('saldhistid').inTable('SALDOHISTORY').defaultTo(null);
	});

	/* This might take a long time, optimizations needed. */
	for (const depositEvent of personhist) {
		await knex('PERSONHIST')
			.update('saldhistid', depositEvent.saldhistid)
			.where('pershistid', depositEvent.pershistid);
	}
};

export const down = async (knex) => {
	if (process.env.NODE_ENV !== 'production') {
		if (await knex.schema.hasColumn('PERSONHIST', 'saldhistid')) {
			await knex.schema.table('PERSONHIST', (table) => {
				table.dropColumn('saldhistid');
			});
		}
	} else {
		throw new Error('dont drop stuff in production');
	}
};
