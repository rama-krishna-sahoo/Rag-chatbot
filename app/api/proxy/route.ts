import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    let targetUrl = req.nextUrl.searchParams.get("url");

    if (!targetUrl || typeof targetUrl !== "string") {
      return new NextResponse("Invalid URL provided", { status: 400 });
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // Attempt to fetch live website HTML
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      next: { revalidate: 0 },
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        let html = await response.text();

        const finalUrl = response.url || targetUrl;
        let baseUrl = finalUrl;
        if (!baseUrl.endsWith("/") && !baseUrl.substring(baseUrl.lastIndexOf("/")).includes(".")) {
          baseUrl += "/";
        }

        // 1. Fix link tags rel attribute (convert rel='preload stylesheet preconnect' etc. to rel="stylesheet")
        html = html.replace(/<link\s+([^>]*?)rel=['"][^'"]*stylesheet[^'"]*['"]([^>]*?)>/gi, (match, p1, p2) => {
          return `<link ${p1}rel="stylesheet"${p2}>`;
        });

        // 2. Fix lazy-loaded images by replacing existing src attribute with data-lazy-src / data-src / data-original if present
        html = html.replace(/<img\s+([^>]*?)>/gi, (imgTag) => {
          const lazySrcMatch = imgTag.match(/data-(?:lazy-src|src|original)=['"]([^'"]+)['"]/i);
          if (lazySrcMatch && lazySrcMatch[1]) {
            const realSrc = lazySrcMatch[1];
            if (/src=['"][^'"]*['"]/i.test(imgTag)) {
              imgTag = imgTag.replace(/src=['"][^'"]*['"]/i, `src="${realSrc}"`);
            } else {
              imgTag = imgTag.replace(/<img\s+/i, `<img src="${realSrc}" `);
            }
          }
          const lazySrcsetMatch = imgTag.match(/data-(?:lazy-srcset|srcset)=['"]([^'"]+)['"]/i);
          if (lazySrcsetMatch && lazySrcsetMatch[1]) {
            const realSrcset = lazySrcsetMatch[1];
            if (/srcset=['"][^'"]*['"]/i.test(imgTag)) {
              imgTag = imgTag.replace(/srcset=['"][^'"]*['"]/i, `srcset="${realSrcset}"`);
            } else {
              imgTag = imgTag.replace(/<img\s+/i, `<img srcset="${realSrcset}" `);
            }
          }
          return imgTag;
        });

        // 3. Strip framebusting scripts (e.g. if (top != self) top.location = self.location)
        html = html.replace(/if\s*\(\s*(?:top|window\.top)\s*!==?\s*(?:self|window\.self)\s*\)[^}]*}/gi, '');

        // 4. Inject <base href="..."> so relative scripts, styles, and images resolve correctly, plus safety CSS
        const baseTag = `<base href="${baseUrl}">`;
        const resetCss = `<style id="oogway-proxy-styles">
          img { max-width: 100% !important; height: auto !important; }
          svg { max-width: 100% !important; }
          iframe { max-width: 100% !important; }
          body { overflow-x: hidden !important; }
        </style>`;

        const headInject = `${baseTag}\n${resetCss}`;

        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head>${headInject}`);
        } else if (html.includes("<HEAD>")) {
          html = html.replace("<HEAD>", `<HEAD>${headInject}`);
        } else {
          html = `${headInject}${html}`;
        }

        // Return live website HTML stripped of X-Frame-Options & CSP frame restrictions
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            Pragma: "no-cache",
            "X-Frame-Options": "ALLOWALL",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    // Fallback to high-resolution WordPress mShots screenshot if direct fetch fails
    return serveScreenshotFallback(targetUrl);
  } catch (error: any) {
    console.warn("Proxy fetch error, serving screenshot fallback:", error?.message);
    const targetUrl =
      req.nextUrl.searchParams.get("url") || "https://example.com";
    return serveScreenshotFallback(
      targetUrl.startsWith("http") ? targetUrl : "https://" + targetUrl
    );
  }
}

function serveScreenshotFallback(url: string) {
  const cleanUrl = url.trim();
  const domain = cleanUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  // WordPress official free mShots screenshot service (no API keys, no paid account restrictions)
  const screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=1280&h=900`;

  const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Storefront Preview - ${domain}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #090d09;
        color: #f8fafc;
        min-height: 100vh;
        margin: 0;
      }
      .screenshot-container {
        width: 100%;
        min-height: 100vh;
        background: #090d09;
      }
      .screenshot-img {
        width: 100%;
        height: auto;
        display: block;
        min-height: 500px;
        object-fit: cover;
      }
    </style>
  </head>
  <body>
    <div class="screenshot-container">
      <img 
        class="screenshot-img" 
        src="${screenshotUrl}" 
        alt="Website Screenshot for ${domain}"
      />
    </div>
  </body>
</html>`;

  return new NextResponse(fallbackHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
