import puppeteer from '@cloudflare/puppeteer';

export async function collectDestinationPageData(env: Env, destinationUrl: string) {
	const browser = await puppeteer.launch(env.VIRTUAL_BROWSER);
	const page = await browser.newPage();

	await page.setUserAgent(
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
	);

	await page.setExtraHTTPHeaders({
		'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
		'Accept-Encoding': 'gzip, deflate, br',
		'Cache-Control': 'max-age=0',
		'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
		'Sec-Fetch-Dest': 'document',
		'Sec-Fetch-Mode': 'navigate',
		'Sec-Fetch-Site': 'none',
		'Sec-Fetch-User': '?1',
		'Upgrade-Insecure-Requests': '1',
	});

	try {
		await page.setViewport({
			width: 1366,
			height: 768,
			deviceScaleFactor: 1,
		});
	} catch (e) {
		console.log('setViewport no disponible');
	}

	const response = await page.goto(destinationUrl, {
		waitUntil: 'networkidle2',
	});

	const bodyText = (await page.$eval('body', (body) => body.innerText)) as string;
	const html = await page.content();
	const status = response?.status() ?? 0;

	// Ensure the browser is closed after the page is collected to free up resources
	await browser.close();

	return {
		bodyText,
		html,
		status,
	};
}
