import { GoogleGenAI, Type } from '@google/genai';
import {
  getPublicKnowledgeBundle,
  rankPublicItems,
  type PublicKnowledgeItem,
} from './aiRetrieval.ts';

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AiSearchResult {
  ai_available: boolean;
  unavailable_reason?: string;
  query: string;
  answer: string;
  suggested_follow_ups: string[];
  matches: PublicKnowledgeItem[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResult {
  ai_available: boolean;
  unavailable_reason?: string;
  reply: string;
  suggested_links: Array<{ title: string; url: string; type: string }>;
}

export async function runAiSearch(query: string): Promise<AiSearchResult> {
  const bundle = await getPublicKnowledgeBundle();
  const topCandidates = rankPublicItems(bundle.items, query, 12);
  const fallbackMatches = topCandidates.length > 0 ? topCandidates.slice(0, 6) : bundle.items.slice(0, 5);

  const ai = getGeminiClient();
  if (!ai) {
    return {
      ai_available: false,
      unavailable_reason: 'AI search summarization is currently unavailable because GEMINI_API_KEY is not configured.',
      query,
      answer: '',
      suggested_follow_ups: [],
      matches: topCandidates.slice(0, 8),
    };
  }

  const contextDocs = (topCandidates.length > 0 ? topCandidates : bundle.items.slice(0, 14))
    .map(
      (item) =>
        `[${item.id}] (${item.type}) ${item.title} — ${item.subtitle}\nDetails: ${item.summary}\nRoute: ${item.url}`,
    )
    .join('\n\n');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Visitor search query: "${query}"\n\nSite Context:\n${bundle.summaryContext}\n\nMatching Public Records:\n${contextDocs}`,
      config: {
        systemInstruction:
          'You are the Konexio Africa public site search assistant. Answer concisely in 2-4 sentences using ONLY the supplied public records. Never invent people, emails, phone numbers, or hidden records. Note clearly if referenced statistics or sample reports are from the demonstration dataset. Select up to 6 most relevant item IDs from the provided list and 2-3 helpful follow-up search queries.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: 'Concise factual summary grounded strictly in the provided public records.',
            },
            matchedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'IDs of the most relevant provided records.',
            },
            followUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 short follow-up search queries for a visitor.',
            },
          },
        },
      },
    });

    const raw = (response.text ?? '{}').trim();
    const parsed = JSON.parse(raw) as {
      answer?: string;
      matchedIds?: string[];
      followUps?: string[];
    };

    const byId = new Map(bundle.items.map((item) => [item.id, item]));
    const matchedFromAi = Array.isArray(parsed.matchedIds)
      ? parsed.matchedIds.map((id) => byId.get(id)).filter((x): x is PublicKnowledgeItem => Boolean(x))
      : [];

    return {
      ai_available: true,
      query,
      answer:
        typeof parsed.answer === 'string' && parsed.answer.trim()
          ? parsed.answer.trim()
          : 'Here are the closest public matches across Konexio Africa.',
      suggested_follow_ups: Array.isArray(parsed.followUps)
        ? parsed.followUps.filter((s): s is string => typeof s === 'string').slice(0, 3)
        : [],
      matches: matchedFromAi.length > 0 ? matchedFromAi.slice(0, 6) : fallbackMatches,
    };
  } catch (error) {
    console.error('Gemini search request failed:', error);
    return {
      ai_available: false,
      unavailable_reason: 'AI summary is temporarily unavailable; showing direct public keyword matches.',
      query,
      answer: '',
      suggested_follow_ups: [],
      matches: topCandidates.slice(0, 8),
    };
  }
}

export async function runVisitorChat(message: string, history: ChatTurn[]): Promise<AiChatResult> {
  const bundle = await getPublicKnowledgeBundle();
  const recentText = `${history.map((h) => h.content).join(' ')} ${message}`;
  const relevant = rankPublicItems(bundle.items, recentText, 12);
  const contextList = relevant.length > 0 ? relevant : bundle.items.slice(0, 12);

  const ai = getGeminiClient();
  if (!ai) {
    return {
      ai_available: false,
      unavailable_reason: 'The AI assistant is currently unavailable because GEMINI_API_KEY is not configured on the server.',
      reply:
        'AI assistant responses are currently unavailable. You can still browse Programmes, the consented Alumni Directory, Impact Reports, or send an enquiry via Contact.',
      suggested_links: [
        { title: 'Explore Programmes', url: '/programmes', type: 'page' },
        { title: 'Browse Alumni Talent', url: '/alumni', type: 'page' },
        { title: 'Contact Team', url: '/contact', type: 'page' },
      ],
    };
  }

  const contextDocs = contextList
    .map(
      (item) =>
        `[${item.id}] (${item.type}) ${item.title} — ${item.subtitle}\nSummary: ${item.summary}\nLink: ${item.url}`,
    )
    .join('\n\n');

  const historyText = history
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'Visitor' : 'Assistant'}: ${h.content}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `${bundle.summaryContext}\n\nPublic Knowledge Context:\n${contextDocs}\n\nConversation History:\n${historyText || '(New conversation)'}\n\nLatest Visitor Question:\n${message}`,
      config: {
        systemInstruction:
          'You are the Konexio Africa Public Visitor Assistant. Help prospective learners, employers, clients, donors, and partners navigate Digi Pass programmes, public consented alumni profiles, impact data, and onboarding paths. Use ONLY the provided public knowledge context. Never reveal or speculate about private records, internal accounts, or personal contact details. Keep answers warm, clear, concise (under 140 words), and recommend up to 3 relevant record IDs so the UI can render navigation links.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Helpful, accurate visitor response grounded strictly in the provided public context.',
            },
            recommendedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 3 record IDs from the provided context for navigation links.',
            },
          },
        },
      },
    });

    const raw = (response.text ?? '{}').trim();
    const parsed = JSON.parse(raw) as { reply?: string; recommendedIds?: string[] };
    const byId = new Map(bundle.items.map((item) => [item.id, item]));
    const links = Array.isArray(parsed.recommendedIds)
      ? parsed.recommendedIds
          .map((id) => byId.get(id))
          .filter((x): x is PublicKnowledgeItem => Boolean(x))
          .slice(0, 3)
          .map((item) => ({ title: item.title, url: item.url, type: item.type }))
      : contextList.slice(0, 3).map((item) => ({ title: item.title, url: item.url, type: item.type }));

    return {
      ai_available: true,
      reply:
        typeof parsed.reply === 'string' && parsed.reply.trim()
          ? parsed.reply.trim()
          : 'I can help you explore Konexio Africa’s programmes, public alumni directory, and partnership options.',
      suggested_links: links,
    };
  } catch (error) {
    console.error('Gemini visitor chat failed:', error);
    return {
      ai_available: false,
      unavailable_reason: 'The AI assistant could not reach Gemini right now.',
      reply:
        'Our AI assistant is temporarily unavailable. Here are direct links to explore Konexio Africa’s programmes, alumni talent, or contact our team.',
      suggested_links: contextList
        .slice(0, 3)
        .map((item) => ({ title: item.title, url: item.url, type: item.type })),
    };
  }
}
