import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    let targetUrl = req.nextUrl.searchParams.get("url");

    if (!targetUrl || typeof targetUrl !== "string") {
      return new NextResponse("Invalid URL provided (parameter missing)", { status: 400 });
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // We do a GET request instead of HEAD because many WAFs block HEAD requests.
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      }
    });

    if (!response.ok) {
      console.warn(`Fetch failed for ${targetUrl} with status: ${response.status}. Serving screenshot fallback.`);
      return serveScreenshotFallback(targetUrl);
    }

    const xfo = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');

    const blocksIframe = 
      (xfo && (xfo.toUpperCase().includes('DENY') || xfo.toUpperCase().includes('SAMEORIGIN'))) ||
      (csp && csp.toLowerCase().includes('frame-ancestors'));

    if (blocksIframe) {
      console.warn(`Target ${targetUrl} blocks iframing natively (X-Frame-Options/CSP). Serving screenshot fallback.`);
      return serveScreenshotFallback(targetUrl);
    }

    // If the site allows iframing, we redirect the browser directly to the native URL.
    // This is vastly superior to proxying the HTML, because native iframes preserve 
    // the correct window.location context, avoiding fatal hydration errors in Next.js/React SPAs.
    return NextResponse.redirect(targetUrl);

  } catch (error: any) {
    console.warn("Proxy error caught, falling back to screenshot:", error.message);
    const targetUrl = req.nextUrl.searchParams.get("url") || "https://example.com";
    return serveScreenshotFallback(targetUrl.startsWith("http") ? targetUrl : "https://" + targetUrl);
  }
}

function serveScreenshotFallback(url: string) {
  const fallbackHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>Preview Fallback</title>
    <style>
      body { margin: 0; padding: 0; background: #ffffff; }
      .screenshot-container { width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; overflow: hidden; }
      .desktop-img { display: block; width: 100%; height: auto; }
      .mobile-img { display: none; width: 100%; height: 100vh; object-fit: cover; object-position: top center; }
      
      @media (max-width: 600px) {
        .desktop-img { display: none; }
        .mobile-img { display: block; }
      }
    </style>
  </head>
  <body>
    <div class="screenshot-container">
      <img class="desktop-img" src="https://image.thum.io/get/width/1200/crop/1200/${url}" alt="Desktop Screenshot Fallback" />
      <img class="mobile-img" src="https://image.thum.io/get/iphoneX/crop/2400/${url}" alt="Mobile Screenshot Fallback" />
    </div>
  </body>
</html>`;

  return new NextResponse(fallbackHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    }
  });
}
