import { GoogleGenAI, Type } from '@google/genai';

// Initialize server-side Gemini client according to system guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Model fallback chain to handle 503 high demand / 429 rate limits gracefully
const MODEL_FALLBACK_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

/**
 * Resilient Gemini API call wrapper with exponential backoff retry
 * and automatic model fallback.
 */
async function callGeminiWithRetry(contents: any, config?: any): Promise<any> {
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err?.status || err?.toString() || '');
        const isTransient =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('Overloaded');

        if (isTransient && attempt < 2) {
          // Wait with exponential backoff before retry (600ms, 1200ms)
          const delay = (attempt + 1) * 600;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If not a transient rate-limit error, or retries exhausted for this model, try next model in fallback chain
        break;
      }
    }
  }

  throw lastError;
}

export class AiService {
  /**
   * Generates multiple contextual reply suggestions for a message.
   */
  public async generateReplies(params: {
    messageText: string;
    chatTitle?: string;
    senderName?: string;
  }): Promise<{
    short: string;
    formal: string;
    friendly: string;
    professional: string;
    arabic: string;
    english: string;
  }> {
    try {
      const prompt = `You are an intelligent Telegram AI assistant. Based on the following incoming message from "${params.senderName || 'Sender'}" in chat "${params.chatTitle || 'Chat'}":
Message: "${params.messageText}"

Generate 6 high-quality reply options with different tones:
1. short (رد مختصر وسريع)
2. formal (رد رسمي ومحترم)
3. friendly (رد ودّي ولطيف)
4. professional (رد احترافي وعملي)
5. arabic (رد طبيعي بلهجة عربية فصحى معاصرة)
6. english (natural, clear English reply)

Respond strictly in JSON matching the specified schema.`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            short: { type: Type.STRING },
            formal: { type: Type.STRING },
            friendly: { type: Type.STRING },
            professional: { type: Type.STRING },
            arabic: { type: Type.STRING },
            english: { type: Type.STRING },
          },
          required: ['short', 'formal', 'friendly', 'professional', 'arabic', 'english'],
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err: any) {
      console.error('[AI Service] generateReplies error:', err?.message || err);
    }

    // Fallback if AI call fails
    return {
      short: 'شكراً، تم الاستلام.',
      formal: 'أشكرك على رسالتك، سأقوم بالرد عليك في أقرب وقت.',
      friendly: 'أهلاً بك! تم الاطلاع وبإذن الله نتواصل قريباً.',
      professional: 'مرحباً، تم استلام رسالتك وسيتم متابعة الموضوع.',
      arabic: 'أهلاً وسهلاً، شكراً لتواصلك.',
      english: 'Thank you for your message. I have received it.',
    };
  }

  /**
   * Summarizes single or multiple Telegram messages.
   */
  public async summarizeMessages(params: {
    messages: Array<{ sender: string; text: string; date?: string }>;
  }): Promise<{ summary: string; keyPoints: string[]; sentiment?: string }> {
    try {
      const formatted = params.messages
        .map((m, idx) => `[${idx + 1}] ${m.sender}: ${m.text}`)
        .join('\n');

      const prompt = `Analyze and summarize the following Telegram conversation/messages clearly and concisely in Arabic:
${formatted}

Provide:
1. A coherent summary paragraph.
2. A list of 3-5 key points or decisions.
3. General tone / sentiment (positive, neutral, urgent, etc.)`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'Comprehensive summary in Arabic' },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key takeaways and bullet points',
            },
            sentiment: { type: Type.STRING },
          },
          required: ['summary', 'keyPoints'],
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err: any) {
      console.error('[AI Service] summarizeMessages error:', err?.message || err);
    }

    return {
      summary: 'تعذر إنشاء التلخيص التلقائي في الوقت الحالي.',
      keyPoints: ['يرجى مراجعة نص الرسائل المحددة مباشرة.'],
    };
  }

  /**
   * Translates text into target language.
   */
  public async translateText(params: {
    text: string;
    targetLanguage: string;
  }): Promise<{ translatedText: string; detectedSourceLanguage?: string }> {
    try {
      if (!params.text || !params.text.trim()) {
        return { translatedText: '', detectedSourceLanguage: 'Unknown' };
      }

      const prompt = `You are a professional, high-accuracy translator. Translate the following text into ${params.targetLanguage}.
Guidelines:
1. Preserve all Markdown formatting, URLs, @usernames, #hashtags, emojis, and code blocks untouched.
2. Produce a natural, fluent, and accurate translation matching the context and tone.
3. Accurately detect the source language.

Original Text:
${JSON.stringify(params.text)}

Respond strictly in JSON matching the schema.`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            detectedSourceLanguage: { type: Type.STRING },
          },
          required: ['translatedText', 'detectedSourceLanguage'],
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err: any) {
      console.error('[AI Service] translateText error:', err?.message || err);
    }

    return { translatedText: params.text, detectedSourceLanguage: 'Auto' };
  }

  /**
   * Batch translates multiple messages efficiently with high throughput.
   */
  public async translateBatch(params: {
    items: Array<{ id: string | number; text: string }>;
    targetLanguage: string;
  }): Promise<
    Array<{
      id: string | number;
      translatedText: string;
      detectedSourceLanguage?: string;
    }>
  > {
    try {
      if (!params.items || params.items.length === 0) {
        return [];
      }

      // Filter non-empty items
      const validItems = params.items.filter((item) => item.text && item.text.trim().length > 0);
      if (validItems.length === 0) {
        return params.items.map((i) => ({ id: i.id, translatedText: i.text }));
      }

      const prompt = `You are an expert multilingual translator. Translate each of the following Telegram messages into ${params.targetLanguage}.
Important rules:
- Preserve all URLs, links, @mentions, #tags, numbers, tickers, emojis, and code formatting intact.
- Translate accurately and fluently.
- Return an array of objects corresponding 1-to-1 with the input items with their exact "id".

Input messages list:
${JSON.stringify(validItems, null, 2)}

Respond strictly in JSON matching the schema.`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              detectedSourceLanguage: { type: Type.STRING },
            },
            required: ['id', 'translatedText'],
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed: Array<{ id: string; translatedText: string; detectedSourceLanguage?: string }> = JSON.parse(text);
        const resultMap = new Map<string, { translatedText: string; detectedSourceLanguage?: string }>();
        parsed.forEach((p) => {
          resultMap.set(String(p.id), {
            translatedText: p.translatedText,
            detectedSourceLanguage: p.detectedSourceLanguage,
          });
        });

        return params.items.map((item) => {
          const match = resultMap.get(String(item.id));
          return {
            id: item.id,
            translatedText: match ? match.translatedText : item.text,
            detectedSourceLanguage: match?.detectedSourceLanguage || 'Auto',
          };
        });
      }
    } catch (err: any) {
      console.error('[AI Service] translateBatch error:', err?.message || err);
    }

    // Fallback: return originals
    return params.items.map((item) => ({
      id: item.id,
      translatedText: item.text,
      detectedSourceLanguage: 'Auto',
    }));
  }

  /**
   * Extracts structured entities from Telegram text: links, emails, numbers, usernames, dates, action items.
   */
  public async extractInformation(params: { text: string }): Promise<{
    links: string[];
    emails: string[];
    numbers: string[];
    usernames: string[];
    dates: string[];
    summaryPoints: string[];
  }> {
    try {
      const prompt = `Extract all structured entities and key information from this Telegram text:
"${params.text}"

Extract:
- links (URLs, http, https, t.me)
- emails
- numbers (phone numbers, amounts, monetary values, prices)
- usernames (@mentions, channels, usernames)
- dates (dates, deadlines, times)
- summaryPoints (important facts)`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            links: { type: Type.ARRAY, items: { type: Type.STRING } },
            emails: { type: Type.ARRAY, items: { type: Type.STRING } },
            numbers: { type: Type.ARRAY, items: { type: Type.STRING } },
            usernames: { type: Type.ARRAY, items: { type: Type.STRING } },
            dates: { type: Type.ARRAY, items: { type: Type.STRING } },
            summaryPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['links', 'emails', 'numbers', 'usernames', 'dates', 'summaryPoints'],
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err: any) {
      console.error('[AI Service] extractInformation error:', err?.message || err);
    }

    return {
      links: [],
      emails: [],
      numbers: [],
      usernames: [],
      dates: [],
      summaryPoints: [],
    };
  }

  /**
   * AI Channel Finder: Match user's query with real Telegram channels & groups.
   */
  public async findChannels(params: {
    query: string;
    channels: Array<{ id: string; title: string; username?: string; isChannel: boolean; isGroup: boolean; unreadCount?: number }>;
  }): Promise<
    Array<{
      id: string;
      title: string;
      matchScore: number;
      reason: string;
      matchedKeywords: string[];
    }>
  > {
    try {
      const channelCatalog = params.channels.map((c) => ({
        id: c.id,
        title: c.title,
        username: c.username || '',
        type: c.isChannel ? 'Channel' : 'Group',
      }));

      const prompt = `You are a Telegram Channel & Group finder.
The user wants to find relevant channels/groups matching this query: "${params.query}".

Here is the user's REAL Telegram channels/groups list:
${JSON.stringify(channelCatalog, null, 2)}

Match and rank ONLY the real channels from the provided list that are relevant to the user query.
Do NOT invent or hallucinate channels not in the list.
For each matching channel, give:
- id (exact ID from list)
- title (exact title)
- matchScore (0 to 100)
- reason (brief explanation in Arabic why it matches)
- matchedKeywords (related keywords/topics like Gold, Trading, Tech, News, etc.)

Return in descending order of matchScore.`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['id', 'title', 'matchScore', 'reason', 'matchedKeywords'],
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err: any) {
      console.error('[AI Service] findChannels error:', err?.message || err);
    }

    // Fallback keyword filter on real list
    const q = params.query.toLowerCase();
    return params.channels
      .filter((c) => c.title.toLowerCase().includes(q) || (c.username && c.username.toLowerCase().includes(q)))
      .map((c) => ({
        id: c.id,
        title: c.title,
        matchScore: 90,
        reason: 'تطابق نصي مباشر مع اسم القناة أو المعرف.',
        matchedKeywords: [params.query],
      }));
  }

  /**
   * AI Command Center NLP parser.
   */
  public async parseCommand(params: {
    command: string;
    activeChatTitle?: string;
    selectedCount?: number;
  }): Promise<{
    intent: 'copy' | 'summarize' | 'translate' | 'extract' | 'forward' | 'delete' | 'search' | 'find_channels' | 'save' | 'unknown';
    isSensitive: boolean;
    confirmationPrompt?: string;
    parameters: Record<string, any>;
    explanation: string;
  }> {
    try {
      const prompt = `Parse this user natural language command for Telegram AI Workspace:
Command: "${params.command}"
Context: Active Chat="${params.activeChatTitle || 'None'}", Selected Messages Count=${params.selectedCount || 0}

Determine the user's intent:
Intents:
- "copy" (e.g. انسخ الرسالة, copy selected, انسخ آخر رسالة)
- "summarize" (e.g. لخص الرسائل, summarize conversation)
- "translate" (e.g. ترجم إلى العربية, translate to english)
- "extract" (e.g. استخرج الروابط, extract emails/numbers)
- "forward" (e.g. حول الرسائل إلى قناة XYZ, forward messages) -> Sensitive!
- "delete" (e.g. احذف الرسائل المحددة) -> Sensitive!
- "search" (e.g. ابحث عن XAUUSD, find messages with TradingView)
- "find_channels" (e.g. طلع لي قنوات التداول والذهب)
- "save" (e.g. احفظ في المفضلة, save to trading collection)
- "unknown"

Sensitive actions (forward, delete, send) MUST have isSensitive: true and a clear Arabic confirmationPrompt.`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING },
            isSensitive: { type: Type.BOOLEAN },
            confirmationPrompt: { type: Type.STRING },
            parameters: {
              type: Type.OBJECT,
              properties: {
                targetLanguage: { type: Type.STRING },
                searchQuery: { type: Type.STRING },
                category: { type: Type.STRING },
                targetChat: { type: Type.STRING },
              },
            },
            explanation: { type: Type.STRING },
          },
          required: ['intent', 'isSensitive', 'explanation'],
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text) as any;
      }
    } catch (err: any) {
      console.error('[AI Service] parseCommand error:', err?.message || err);
    }

    return {
      intent: 'unknown',
      isSensitive: false,
      parameters: {},
      explanation: 'تعذر فهم الأمر، يرجى إعادة الصياغة أو استخدام الأزرار المباشرة.',
    };
  }

  /**
   * AI Smart Folder & Channel Categorizer:
   * Analyzes all user channels, groups, and chats and categorizes them into smart topic folders.
   */
  public async categorizeDialogs(params: {
    dialogs: Array<{
      id: string;
      title: string;
      username?: string;
      type: string;
      lastMessageSnippet?: string;
      isChannel: boolean;
      isGroup: boolean;
      isUser: boolean;
    }>;
  }): Promise<
    Array<{
      id: string;
      title: string;
      icon: string;
      description: string;
      chatIds: string[];
    }>
  > {
    try {
      if (!params.dialogs || params.dialogs.length === 0) {
        return [];
      }

      // Prepare compact catalog for AI
      const catalog = params.dialogs.map((d) => ({
        id: String(d.id),
        title: d.title,
        username: d.username ? `@${d.username}` : '',
        type: d.isChannel ? 'قناة' : d.isGroup ? 'مجموعة' : 'محادثة خاصة',
        sample: d.lastMessageSnippet ? d.lastMessageSnippet.slice(0, 70) : '',
      }));

      const prompt = `أنت خبير ذكاء اصطناعي متخصص في تنظيم وتصنيف قنوات ومحادثات تيليجرام إلى مجلدات وتبويبات ذكية مخصصة (Smart Telegram Folders).
لديك قائمة بالقنوات والمجموعات والمحادثات الحقيقية للمستخدم:
${JSON.stringify(catalog, null, 2)}

المطلوب:
قم بتحليل أسماء القنوات والمعرفات ومحتواها وفرزها وتوزيعها في مجلدات ذكية ذات معنى وفائدة عالية.
أنشئ ما بين 4 إلى 8 فئات/مجلدات ذكية واضحة ومحددة تناسب المحتوى الموجود فعلياً، مثل:
- 📊 تداول واستثمار وعملات (Trading & Finance)
- 🤖 تقنية وبرمجة وذكاء اصطناعي (Tech & AI)
- 📰 أخبار وعالم وأحداث (News & Current Events)
- 🎓 تعليم ودورات وتطوير (Education & Learning)
- 🎬 ترفيه ومنوعات وميديا (Entertainment & Media)
- 💬 مجموعات ونقاشات مجتمعية (Community & Groups)
- 🛍️ عروض وتسوق وخدمات (Shopping & Services)
- 🕋 دين وثقافة وقيم (Religion & Culture)
- 💼 أعمال وتوظيف (Business & Jobs)
- أو أي تصنيفات أخرى تلائم قنوات المستخدم بدقة.

قواعد هامة:
1. كل قناة أو محادثة يجب أن يتم وضع معرفها (id) في الفئة الأنسب لها في مصفوفة chatIds.
2. استخدم أيقونات إيموجي ممتازة وعناوين عربية واضحة وجذابة.
3. تأكد أن معرفات (id) مطابقة تماماً للموجودة في القائمة المدخلة.
4. لا تخترع قنوات من خارج القائمة.

أرجع النتيجة بصيغة JSON مطابقة تماماً للـ Schema.`;

      const response = await callGeminiWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'Folder ID in english letters, e.g. trading, tech, news' },
              title: { type: Type.STRING, description: 'Folder title in Arabic with emoji, e.g. 📊 تداول واستثمار' },
              icon: { type: Type.STRING, description: 'Emoji icon, e.g. 📊' },
              description: { type: Type.STRING, description: 'Short Arabic description' },
              chatIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Array of chat IDs belonging to this smart category',
              },
            },
            required: ['id', 'title', 'icon', 'description', 'chatIds'],
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err: any) {
      console.error('[AI Service] categorizeDialogs error:', err?.message || err);
    }

    // Heuristic Fallback rule-based categorization
    const tradingIds: string[] = [];
    const techIds: string[] = [];
    const newsIds: string[] = [];
    const mediaIds: string[] = [];
    const groupIds: string[] = [];
    const generalIds: string[] = [];

    for (const d of params.dialogs) {
      const lower = `${d.title} ${d.username || ''}`.toLowerCase();
      const id = String(d.id);
      if (/gold|xau|trade|تداول|فوركس|crypto|btc|أسهم|عملات|استثمار|بورصة/.test(lower)) {
        tradingIds.push(id);
      } else if (/ai|ذكاء|تقني|برمج|code|tech|bot|python|web|تطوير/.test(lower)) {
        techIds.push(id);
      } else if (/خبر|news|عاجل|حدث|إعلام|صحيفة|أخبار/.test(lower)) {
        newsIds.push(id);
      } else if (/فيديو|movie|ضحك|ترفيه|طرائف|anime|أغاني|موسيقى/.test(lower)) {
        mediaIds.push(id);
      } else if (d.isGroup) {
        groupIds.push(id);
      } else {
        generalIds.push(id);
      }
    }

    const fallbackFolders = [];
    if (tradingIds.length > 0) {
      fallbackFolders.push({
        id: 'trading',
        title: '📊 تداول واستثمار',
        icon: '📊',
        description: 'قنوات التداول والذهب والعملات والأسواق',
        chatIds: tradingIds,
      });
    }
    if (techIds.length > 0) {
      fallbackFolders.push({
        id: 'tech',
        title: '🤖 تقنية وذكاء اصطناعي',
        icon: '🤖',
        description: 'قنوات ومجموعات البرمجة والذكاء والتقنية',
        chatIds: techIds,
      });
    }
    if (newsIds.length > 0) {
      fallbackFolders.push({
        id: 'news',
        title: '📰 أخبار وعالم',
        icon: '📰',
        description: 'متابعة الأخبار والتغطيات الإخبارية',
        chatIds: newsIds,
      });
    }
    if (mediaIds.length > 0) {
      fallbackFolders.push({
        id: 'entertainment',
        title: '🎬 ترفيه وميديا',
        icon: '🎬',
        description: 'قنوات الفيديوهات والمنوعات والترفيه',
        chatIds: mediaIds,
      });
    }
    if (groupIds.length > 0) {
      fallbackFolders.push({
        id: 'groups_discussions',
        title: '💬 مجموعات ونقاشات',
        icon: '💬',
        description: 'مجموعات النقاش التفاعلية',
        chatIds: groupIds,
      });
    }
    if (generalIds.length > 0) {
      fallbackFolders.push({
        id: 'general_channels',
        title: '📁 قنوات متنوعة',
        icon: '📁',
        description: 'باقي القنوات والمحادثات',
        chatIds: generalIds,
      });
    }

    return fallbackFolders;
  }
}

export const aiService = new AiService();
