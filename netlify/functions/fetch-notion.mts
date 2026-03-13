import type { Context } from "@netlify/functions";

const DB_IDS: Record<string, string | undefined> = {
  about:      process.env.NOTION_DB_ABOUT,
  projects:   process.env.NOTION_DB_PROJECTS,
  timeline:   process.env.NOTION_DB_TIMELINE,
  experience: process.env.NOTION_DB_EXPERIENCE,
};

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const page = url.searchParams.get("q") ?? "";
  const dbId = DB_IDS[page];

  if (!dbId) {
    return Response.json({ error: `Unknown page: ${page}` }, { status: 400 });
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
    const data = await notionRes.json();
    return Response.json(data, { status: notionRes.status });
  } catch {
    return Response.json({ error: "Notion request failed" }, { status: 500 });
  }
};
