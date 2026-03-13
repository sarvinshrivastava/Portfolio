export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Strip /api/notion prefix to get the Notion API path
  const notionPath = url.pathname.replace(/^\/api\/notion\/?/, '');

  const notionRes = await fetch(`https://api.notion.com/v1/${notionPath}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: request.method !== 'GET' ? request.body : undefined,
  });

  const text = await notionRes.text();
  return new Response(text, {
    status: notionRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
