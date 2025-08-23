import { deleteClicksBefore, getRecentClicks } from '@/helpers/durable-queries';
import { DurableObject } from 'cloudflare:workers';
import { addSeconds } from 'date-fns';

export class LinkClickTracker extends DurableObject {
	sql: SqlStorage;

	mostRecentOffsetTime: number = 0;
	leastRecentOffsetTime: number = 0;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		ctx.blockConcurrencyWhile(async () => {
			const [mostRecentOffsetTime, leastRecentOffsetTime] = await Promise.all([
				ctx.storage.get<number>('mostRecentOffsetTime'),
				ctx.storage.get<number>('leastRecentOffsetTime'),
			]);

			this.mostRecentOffsetTime = mostRecentOffsetTime ?? this.mostRecentOffsetTime;
			this.leastRecentOffsetTime = leastRecentOffsetTime ?? this.leastRecentOffsetTime;

			this.sql.exec(`
            CREATE TABLE IF NOT EXISTS geo_link_clicks (
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                country TEXT NOT NULL,
                time INTEGER NOT NULL
            )
        `);
		});
	}

	async addClick(latitude: number, longitude: number, country: string, time: number) {
		this.sql.exec(
			`
			INSERT INTO geo_link_clicks (latitude, longitude, country, time)
			VALUES (?, ?, ?, ?)
			`,
			latitude,
			longitude,
			country,
			time
		);

		const alarm = await this.ctx.storage.getAlarm();
		if (!alarm) await this.ctx.storage.setAlarm(addSeconds(new Date(), 2));
	}

	async alarm() {
		const { clicks, mostRecentTime, oldestTime } = getRecentClicks(this.sql, this.mostRecentOffsetTime);

		const sockets = this.ctx.getWebSockets();
		for (const socket of sockets) {
			socket.send(JSON.stringify(clicks));
		}

		await this.flushOffsetTimes(mostRecentTime, oldestTime);
		deleteClicksBefore(this.sql, oldestTime);
	}

	async flushOffsetTimes(mostRecentOffsetTime: number, leastRecentOffsetTime: number) {
		this.mostRecentOffsetTime = mostRecentOffsetTime;
		this.leastRecentOffsetTime = leastRecentOffsetTime;

		await Promise.all([
			this.ctx.storage.put('mostRecentOffsetTime', this.mostRecentOffsetTime),
			this.ctx.storage.put('leastRecentOffsetTime', this.leastRecentOffsetTime),
		]);
	}

	async fetch(_: Request) {
		const websocketPair = new WebSocketPair();
		const [client, server] = Object.values(websocketPair);
		this.ctx.acceptWebSocket(server);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}
