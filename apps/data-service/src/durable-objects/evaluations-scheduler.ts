import { DurableObject } from 'cloudflare:workers';
import { add } from 'date-fns';

interface ClickData {
	accountId: string;
	linkId: string;
	destinationUrl: string;
	destinationCountryCode: string;
}

export class EvaluationsScheduler extends DurableObject<Env> {
	clickData: ClickData | undefined;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.clickData = await ctx.storage.get<ClickData>('click_data');
		});
	}

	async collectLinkClick(clickData: ClickData) {
		this.clickData = clickData;
		await this.ctx.storage.put('click_data', clickData);

		const alarm = await this.ctx.storage.getAlarm();
		if (!alarm) {
			await this.ctx.storage.setAlarm(add(new Date(), { days: 1 }));
		}
	}

	async alarm() {
		console.log('EvaluationsScheduler: alarm triggered', this.clickData);
		const clickData = this.clickData;
		if (!clickData) throw new Error('This alarm cannot be triggered without click data. This should never happen.');

		await this.env.DESTINATION_EVALUATION_WORKFLOW.create({
			params: {
				linkId: clickData.linkId,
				destinationUrl: clickData.destinationUrl,
				accountId: clickData.accountId,
			},
		});
	}

	async getClickData() {
		return this.clickData;
	}
}
