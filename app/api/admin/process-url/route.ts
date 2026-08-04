import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { processUrlForWorkspace } from "@/lib/website-processor";

// Helper to fetch and extract URLs from sitemaps (standard XML format)
async function fetchSitemapUrls(origin: string): Promise<string[]> {
  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-pages.xml"];
  for (const path of sitemapPaths) {
    try {
      console.log(`Trying to fetch sitemap: ${origin + path}`);
      const res = await fetch(origin + path, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      if (res.ok) {
        const xml = await res.text();
        const locMatches = xml.match(/<loc>(https?:\/\/[^<]+)<\/loc>/gi);
        if (locMatches) {
          const extracted = locMatches.map(m => m.replace(/<\/?loc>/gi, "").trim());
          console.log(`Successfully extracted ${extracted.length} URLs from sitemap ${path}`);
          return extracted;
        }
      }
    } catch (e) {
      console.error(`Error fetching/parsing sitemap at ${path}:`, e);
    }
  }
  return [];
}

// Fallback to scrape the page directory index and extract anchor links
async function fetchPageLinks(baseUrl: string): Promise<string[]> {
  try {
    console.log(`Trying fallback page scraping for links at: ${baseUrl}`);
    const res = await fetch(baseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (res.ok) {
      const html = await res.text();
      const hrefMatches = html.match(/href=["']([^"']+)["']/gi);
      if (hrefMatches) {
        const urls: string[] = [];
        for (const match of hrefMatches) {
          const val = match.replace(/href=["']/i, "").replace(/["']/g, "").trim();
          try {
            const absolute = new URL(val, baseUrl).toString();
            urls.push(absolute);
          } catch (e) {
            // ignore invalid urls
          }
        }
        return urls;
      }
    }
  } catch (e) {
    console.error(`Error fetching page links at ${baseUrl}:`, e);
  }
  return [];
}

// Matches a URL against a pattern with wildcards (e.g. https://domain.com/blog/*)
function matchesWildcard(url: string, pattern: string): boolean {
  const escapedPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
    .replace(/\*/g, ".*");              // Convert * wildcard to .* regex
  const regex = new RegExp(`^${escapedPattern}$`, "i");
  return regex.test(url);
}

export async function POST(req: Request) {
  try {
    const { authorized, supabase, user, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL or input pattern provided." }, { status: 400 });
    }

    // 1. Fetch whitelisted website domain for this workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("website_url")
      .eq("id", workspaceId)
      .single();

    const baseWebsiteUrl = workspace?.website_url || "";

    // 2. Parse and split inputs (handling comma, semicolon, or newline separators)
    const rawInputs = url.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
    const resolvedUrls: string[] = [];

    for (const input of rawInputs) {
      let target = input;
      // Prepend base website URL if input is relative
      if (!target.startsWith("http://") && !target.startsWith("https://")) {
        if (!baseWebsiteUrl) {
          return NextResponse.json({ error: "Please configure your website URL in Settings first." }, { status: 400 });
        }
        let base = baseWebsiteUrl.trim();
        if (!base.startsWith("http")) base = "https://" + base;
        if (!base.endsWith("/")) base += "/";
        if (target.startsWith("/")) target = target.slice(1);
        target = base + target;
      }

      try {
        const parsedTarget = new URL(target);
        const parsedBase = new URL(baseWebsiteUrl.startsWith("http") ? baseWebsiteUrl : "https://" + baseWebsiteUrl);

        const targetHost = parsedTarget.hostname.replace(/^www\./, "");
        const baseHost = parsedBase.hostname.replace(/^www\./, "");

        // Enforce whitelisted domain boundaries
        if (targetHost === baseHost || targetHost.endsWith("." + baseHost)) {
          resolvedUrls.push(target);
        }
      } catch (e) {
        // Skip invalid URL formats
        continue;
      }
    }

    if (resolvedUrls.length === 0) {
      return NextResponse.json({ error: "No valid URLs matching your whitelisted domain were found." }, { status: 400 });
    }

    // 3. Resolve wildcards & build final list
    const finalUrls: string[] = [];

    for (const pattern of resolvedUrls) {
      if (pattern.includes("*")) {
        // Retrieve domain origin for sitemap crawling
        const parsedPattern = new URL(pattern);
        const origin = parsedPattern.origin;

        // Try sitemap parsing first
        let availableUrls = await fetchSitemapUrls(origin);

        // Fallback: scrape links from wildcard directory base page if sitemaps yielded nothing
        if (availableUrls.length === 0) {
          const basePath = pattern.split("*")[0];
          availableUrls = await fetchPageLinks(basePath);
        }

        // Filter URLs matching wildcard pattern
        const matched = availableUrls.filter(u => matchesWildcard(u, pattern));
        finalUrls.push(...matched);
      } else {
        finalUrls.push(pattern);
      }
    }

    // 4. De-duplicate URLs
    const uniqueUrls = Array.from(new Set(finalUrls));

    if (uniqueUrls.length === 0) {
      return NextResponse.json({ error: "Wildcard pattern resolved to 0 matched pages." }, { status: 400 });
    }

    // 5. Slice to batch cap limit (15 pages) to prevent API timeout
    const maxLimit = 15;
    const cappedUrls = uniqueUrls.slice(0, maxLimit);
    const wasCapped = uniqueUrls.length > maxLimit;

    // 6. Ingest all pages in the list sequentially
    let successCount = 0;
    const processedList: string[] = [];
    const errors: string[] = [];

    for (const targetUrl of cappedUrls) {
      try {
        await processUrlForWorkspace(targetUrl, workspaceId, user?.id || null, supabase);
        successCount++;
        processedList.push(targetUrl);
      } catch (e: any) {
        console.error(`Ingestion failed for URL: ${targetUrl}`, e);
        errors.push(`${targetUrl}: ${e.message || "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      processedList,
      successCount,
      totalMatched: uniqueUrls.length,
      wasCapped,
      limit: maxLimit,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err: any) {
    console.error("Error in batch URL process-url:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
