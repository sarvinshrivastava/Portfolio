import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = (req.query.path as string[]) ?? [];
  const notionPath = pathSegments.join('/');

  const notionRes = await fetch(`https://api.notion.com/v1/${notionPath}`, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });

  const data = await notionRes.json();
  res.status(notionRes.status).json(data);
}
