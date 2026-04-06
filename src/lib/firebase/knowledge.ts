import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import type { KnowledgeItem, KnowledgePage } from "@/types/knowledge";

const COLLECTION_NAME = "knowledge_items";

function extractDomain(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function humanizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname
      .split("/")
      .filter(Boolean)
      .pop();

    if (!slug) {
      return extractDomain(url);
    }

    return decodeURIComponent(slug)
      .replace(/[-_]+/g, " ")
      .replace(/\.[a-z0-9]+$/i, "")
      .trim();
  } catch {
    return extractDomain(url);
  }
}

function fallbackTitleFromUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "untitled";
  }

  return trimmed.slice(0, 10);
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTitleFromHtml(html: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const propertyMatch = tag.match(/\b(?:property|name)=["']([^"']+)["']/i);
    const contentMatch = tag.match(/\bcontent=["']([^"]*?)["']/i) ?? tag.match(/\bcontent=['"]([^']*?)['"]/i);
    if (propertyMatch?.[1]?.toLowerCase() === "og:title" && contentMatch?.[1]) {
      return decodeHtmlEntities(contentMatch[1].trim());
    }
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }

  return null;
}

async function resolveKnowledgeTitle(url: string) {
  try {
    const noembedResponse = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000)
    });

    if (noembedResponse.ok) {
      const payload = (await noembedResponse.json()) as { title?: string };
      if (payload.title?.trim()) {
        return decodeHtmlEntities(payload.title.trim());
      }
    }
  } catch {
    // Continue to direct fetch fallback.
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FunywebBot/1.0; +https://funyweb.netlify.app)"
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      return humanizeUrl(url) || fallbackTitleFromUrl(url);
    }

    const html = await response.text();
    return extractTitleFromHtml(html) ?? humanizeUrl(url) ?? fallbackTitleFromUrl(url);
  } catch {
    try {
      const mirrorResponse = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!mirrorResponse.ok) {
        return humanizeUrl(url);
      }

      const mirroredText = await mirrorResponse.text();
      const titleLine = mirroredText.match(/^Title:\s*(.+)$/im)?.[1]?.trim();
      if (titleLine) {
        return decodeHtmlEntities(titleLine);
      }

      const headingLine = mirroredText.match(/^#\s+(.+)$/m)?.[1]?.trim();
      return headingLine ? decodeHtmlEntities(headingLine) : humanizeUrl(url) || fallbackTitleFromUrl(url);
    } catch {
      return humanizeUrl(url) || fallbackTitleFromUrl(url);
    }
  }
}

function toKnowledgeItem(id: string, value: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id,
    url: value.url ?? "",
    title: value.title ?? extractDomain(value.url ?? ""),
    domain: value.domain ?? extractDomain(value.url ?? ""),
    createdAt: value.createdAt ?? new Date(0).toISOString(),
    source: value.source ?? "system"
  };
}

export async function saveKnowledgeUrl(url: string, source: string) {
  const db = getFirebaseAdminDb();

  if (!db) {
    return null;
  }

  const title = await resolveKnowledgeTitle(url);
  const knowledgeDraft = {
    url,
    title,
    domain: extractDomain(url),
    createdAt: new Date().toISOString(),
    source
  };

  const document = await db.collection(COLLECTION_NAME).add(knowledgeDraft);
  return toKnowledgeItem(document.id, knowledgeDraft);
}

export async function listKnowledgeItems(page = 1, pageSize = 5): Promise<KnowledgePage> {
  const db = getFirebaseAdminDb();
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  if (!db) {
    return {
      items: [],
      page: safePage,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: safePage > 1
    };
  }

  const offset = (safePage - 1) * pageSize;
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .orderBy("createdAt", "desc")
    .offset(offset)
    .limit(pageSize + 1)
    .get();

  const documents = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const item = toKnowledgeItem(doc.id, doc.data());
      if (!item.title || item.title === item.domain || item.title === humanizeUrl(item.url) || /^https?:\/\//.test(item.title)) {
        const resolvedTitle = await resolveKnowledgeTitle(item.url);
        if (resolvedTitle && resolvedTitle !== item.title) {
          await db.collection(COLLECTION_NAME).doc(doc.id).set({ title: resolvedTitle }, { merge: true });
          return {
            ...item,
            title: resolvedTitle
          };
        }
      }

      return item;
    })
  );
  const items = documents.slice(0, pageSize);

  return {
    items,
    page: safePage,
    pageSize,
    hasNextPage: documents.length > pageSize,
    hasPreviousPage: safePage > 1
  };
}
