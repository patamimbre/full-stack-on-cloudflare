import { getLink } from '@repo/data-ops/queries/links';
import { LinkSchemaType } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

export function getDestinationFromCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode) {
		return linkInfo.destinations.default;
	}

	return linkInfo.destinations[countryCode] ?? linkInfo.destinations.default;
}

export async function getLinkInfoFromKv(env: Env, id: string) {
	const linkInfoFromKv = await env.KV.get(id);
	if (!linkInfoFromKv) return null;

	try {
		const linkInfo = JSON.parse(linkInfoFromKv) as LinkSchemaType;
		return linkInfo;
	} catch (error) {
		console.error('Error parsing link info from KV', error);
		return null;
	}
}

const TTL_TIME = 60; // 1 minute
export async function storeLinkInfoInKv(env: Env, id: string, linkInfo: LinkSchemaType) {
	try {
		await env.KV.put(id, JSON.stringify(linkInfo), {
			expirationTtl: TTL_TIME,
		});
	} catch (error) {
		console.error('Error storing link info in KV', error);
		// Do not throw to continue the request
	}
}

export async function getRoutingDestination(env: Env, id: string) {
	const linkInfoFromKv = await getLinkInfoFromKv(env, id);
	if (linkInfoFromKv) return linkInfoFromKv;

	const linkInfoFromDb = await getLink(id);
	if (!linkInfoFromDb) return null;

	await storeLinkInfoInKv(env, id, linkInfoFromDb);
	return linkInfoFromDb;
}

export async function scheduleEvaluationWorkflow(env: Env, event: LinkClickMessageType) {
	const doId = env.EVALUATIONS_SCHEDULER.idFromName(`${event.data.id}:${event.data.destination}`);
	const stub = env.EVALUATIONS_SCHEDULER.get(doId);
	await stub.collectLinkClick({
		accountId: event.data.accountId,
		linkId: event.data.id,
		destinationUrl: event.data.destination,
		destinationCountryCode: event.data.country || 'UNKNOWN',
	});
}

export async function captureLinkClickInBackground(env: Env, event: LinkClickMessageType) {
	await env.QUEUE.send(event);
	const doId = env.LINK_CLICK_TRACKER_OBJECT.idFromName(event.data.accountId);
	const stub = env.LINK_CLICK_TRACKER_OBJECT.get(doId);
	if (!event.data.latitude || !event.data.longitude || !event.data.country) return;
	await stub.addClick(event.data.latitude, event.data.longitude, event.data.country, new Date(event.data.timestamp).getTime());
}
