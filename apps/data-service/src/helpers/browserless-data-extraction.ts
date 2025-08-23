import axios from 'axios';

type BrowserlessDataExtractionResponse = {
	html: { html: string };
	goto: { status: number };
	screenshot: { base64: string };
};

export async function extractDataFromBrowserless(env: Env, destinationUrl: string) {
	const options = {
		method: 'POST',
		url: 'https://production-sfo.browserless.io/chrome/bql',
		params: {
			token: env.BROWSERLESS_TOKEN,
			proxy: 'residential',
			proxyCountry: 'us',
			humanlike: true,
			blockConsentModals: true,
		},
		headers: {
			'Content-Type': 'application/json',
		},
		data: {
			query: `
  # Configure settings by clicking the ¦¦¦ button on the right
  mutation DestinationEvaluation($url: String!) {
  
    # to save bandwidth, you can use this reject function
    reject(type: [image, media, font, stylesheet]) {
      enabled
      time
    }
  
    goto(url: $url, waitUntil: firstContentfulPaint) {
      status
    }

    solve(type: recaptcha) {
        found
        solved
        time
    }
  
    # Or export cleaned HTML with numerous options
    html(clean: {
      removeAttributes: true,
      removeNonTextNodes: true
    }) {
      html
    }

    screenshot {
      base64
    }
  }
      `,
			variables: { url: destinationUrl },
		},
	};

	const { data } = await axios.request<{ data: BrowserlessDataExtractionResponse }>(options);
	console.log(data);

	return {
		bodyText: data.data.html.html,
		html: data.data.html.html,
		statusCode: data.data.goto.status,
		screenshot: data.data.screenshot.base64,
	};
}

// (async () => {
// 	const data = await extractDataFromBrowserless(
// 		{
// 			DB: {} as D1Database,
// 		} as any,
// 		'https://www.mediamarkt.es/es/product/_tv-qled-50-samsung-qe50q7f-2025-uhd-4k-ai-q4-prozessor-smart-tv-schwarz-157462190.html'
// 	);
// 	console.log(data);
// })();
