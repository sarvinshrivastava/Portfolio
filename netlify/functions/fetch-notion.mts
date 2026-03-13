import type { Context } from "@netlify/functions";

const KNOWN_PAGES = ["about", "projects", "timeline", "experience"] as const;

const DB_IDS: Record<string, string | undefined> = {
  about:      process.env.NOTION_DB_ABOUT,
  projects:   process.env.NOTION_DB_PROJECTS,
  timeline:   process.env.NOTION_DB_TIMELINE,
  experience: process.env.NOTION_DB_EXPERIENCE,
};

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(req.url);
  const page = url.searchParams.get("q") ?? "";

  if (!KNOWN_PAGES.includes(page as (typeof KNOWN_PAGES)[number])) {
    return Response.json({ error: `Unknown page: ${page}` }, { status: 400 });
  }

  const dbId = DB_IDS[page];
  if (!dbId) {
    return Response.json({ error: `Server misconfiguration: DB ID for "${page}" is not set` }, { status: 500 });
  }

  const body = page !== "about"
    ? { sorts: [{ property: "Sort Order", direction: "ascending" }] }
    : {};

  try {
    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const contentType = notionRes.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await notionRes.text();
      return Response.json(
        { error: "Unexpected response from Notion", detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await notionRes.json();
    return Response.json(data, { status: notionRes.status });
  } catch {
    return Response.json({ error: "Notion request failed" }, { status: 500 });
  }
};
