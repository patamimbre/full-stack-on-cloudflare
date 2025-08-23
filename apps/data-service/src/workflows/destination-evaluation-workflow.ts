import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

import { aiDestinationChecker } from '@/helpers/ai-destination-checker';
import { collectDestinationPageData } from '@/helpers/browser-render';
import { addEvaluation } from '@repo/data-ops/queries/evaluations';
import { initDatabase } from '@repo/data-ops/database';
import { extractDataFromBrowserless } from '@/helpers/browserless-data-extraction';

export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvaluationParams> {
	async run(event: Readonly<WorkflowEvent<DestinationStatusEvaluationParams>>, step: WorkflowStep) {
		initDatabase(this.env.DB);

		const collectedData = await step.do(
			'Collect rendered destination page data',
			{
				retries: {
					limit: 1,
					delay: 1000,
				},
			},
			async () => extractDataFromBrowserless(this.env, event.payload.destinationUrl)
		);

		const aiStatus = await step.do(
			'Use AI to check status of page',
			{
				retries: {
					limit: 0,
					delay: 0,
				},
			},
			async () => aiDestinationChecker(this.env, collectedData.bodyText)
		);

		const evaluationId = await step.do('Save evaluation to database', async () =>
			addEvaluation({
				linkId: event.payload.linkId,
				accountId: event.payload.accountId,
				destinationUrl: event.payload.destinationUrl,
				status: aiStatus.status,
				reason: aiStatus.statusReason,
			})
		);

		await step.do('Backup HTML to R2', async () => {
			const { accountId } = event.payload;
			const r2PathHtml = `evaluations/${accountId}/html/${evaluationId}`;
			const r2PathBodyText = `evaluations/${accountId}/body-text/${evaluationId}`;
			await Promise.all([this.env.BUCKET.put(r2PathHtml, collectedData.html), this.env.BUCKET.put(r2PathBodyText, collectedData.bodyText)]);
		});

		await step.do('Backup screenshot to R2', async () => {
			const { accountId } = event.payload;
			const r2PathScreenshot = `evaluations/${accountId}/screenshot/${evaluationId}`;
			const { screenshot } = collectedData;
			const screenshotDataUrl = `data:image/png;base64,${screenshot}`;
			await this.env.BUCKET.put(r2PathScreenshot, screenshotDataUrl);
		});

		return {
			linkId: event.payload.linkId,
			collectedData,
			aiStatus,
			evaluationId,
		};
	}
}
