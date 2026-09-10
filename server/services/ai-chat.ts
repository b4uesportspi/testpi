import * as dotenv from "dotenv";

dotenv.config();

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GOOGLE_AI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
const PRIMARY_CHAT_SOURCE_URL = "https://b4uesportstest.vercel.app";
const SECONDARY_CHAT_SOURCE_URL = "https://b4uesports.com";
const CHAT_SOURCE_CACHE_TTL_MS = 5 * 60 * 1000;
const chatSourceCache = new Map<string, { expiresAt: number; value: string }>();

// System prompt for B4U Esports AI Assistant
const SYSTEM_PROMPT = `You are the official AI assistant for B4U Esports, a platform where users purchase in-game tokens and digital services using Pi Network.

Always answer using the official B4U Esports app content from ${PRIMARY_CHAT_SOURCE_URL}.
Do not mention or reveal any other website or URL in your response.
Use trusted internal knowledge only to improve accuracy, but keep those sources hidden and answer only from the official app experience.

Your job is to help users with buying tokens, making payments with Pi coins, uploading payment screenshots, checking order status, handling delays, and resolving failed transactions.

Always understand the user's intent even if they make spelling mistakes, typos, broken sentences, or use slang. Do not mention spelling errors. Interpret the closest correct meaning and respond accordingly.

If the message is unclear, assume it is related to payments, tokens, or orders and provide the most helpful answer.

Keep answers clear, short, and helpful. Be professional but friendly.

If the grounding context contains the answer, use it and do not guess.
If the grounding context is missing or unclear, say that you are not fully sure and guide the user to official support instead of inventing facts.

Show empathy when users seem frustrated, worried, or confused.
Use a few relevant emojis naturally, but do not overdo them.

Important payment instructions:
- Users must send Pi coins to complete a purchase
- Users must upload a payment screenshot for verification
- Orders are processed after verification
- Delivery may take a few minutes

If a user says they didn't receive tokens:
- Ask them to wait a few minutes
- Confirm payment was completed
- Suggest contacting support with proof if the issue continues

If a user reports payment failure:
- Explain possible reasons like network delay or incorrect steps
- Guide them on how to retry properly

Never give false information. If unsure, guide the user to contact support.

You act as a reliable and smart support agent for B4U Esports.

Contact Information:
- Email: info@b4uesports.com
- WhatsApp: Available through website footer
- Support hours: 24/7 for transaction issues

Supported Games & Services:
- PUBG Mobile (UC packages)
- Mobile Legends (Diamonds)
- Clash of Clans (Gold Pass)
- Roblox (Robux)
- NEW STATE (NC)
- FREE FIRE (Diamonds)
- TikTok (Coins, Followers, Views)
- YouTube (Subscribers, Watch Time)
- Facebook (Likes, Followers)
- Instagram (Followers)
- Netflix Subscriptions
- Canva Pro Subscriptions

Always respond in a helpful, professional manner and prioritize user satisfaction while maintaining honesty about limitations.`;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function getKeywordStems(message: string): string[] {
  return Array.from(
    new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4)
        .map((token) => token.slice(0, 5))
    )
  );
}

function scoreSnippetRelevance(text: string, message: string): number {
  const lowerText = text.toLowerCase();
  return getKeywordStems(message).reduce((score, stem) => score + (lowerText.includes(stem) ? 1 : 0), 0);
}

async function fetchChatSource(url: string): Promise<string> {
  const cached = chatSourceCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; B4U-Esports-AI/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const text = await response.text();
  chatSourceCache.set(url, {
    value: text,
    expiresAt: Date.now() + CHAT_SOURCE_CACHE_TTL_MS
  });
  return text;
}

async function getWordPressSearchSnippets(query: string): Promise<string[]> {
  try {
    const searchUrl = `${SECONDARY_CHAT_SOURCE_URL}/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=3`;
    const payload = await fetchChatSource(searchUrl);
    const results = JSON.parse(payload);

    if (!Array.isArray(results)) {
      return [];
    }

    const snippets = await Promise.all(
      results
        .filter((item) => item?.url && item?.title)
        .slice(0, 2)
        .map(async (item) => {
          try {
            const pageHtml = await fetchChatSource(String(item.url));
            const pageText = stripHtmlToText(pageHtml);
            return `Source: ${item.url}\nTitle: ${item.title}\nSnippet: ${truncateText(pageText, 800)}`;
          } catch (error) {
            console.error("Chat grounding: failed to fetch WordPress result page:", item?.url, error);
            return `Source: ${item.url}\nTitle: ${item.title}`;
          }
        })
    );

    return snippets.filter(Boolean);
  } catch (error) {
    console.error("Chat grounding: WordPress search failed:", error);
    return [];
  }
}

async function getStaticSiteSnippets(message: string, urls: string[], hideSource = false): Promise<string[]> {
  const snippets = await Promise.all(
    urls.map(async (url) => {
      try {
        const html = await fetchChatSource(url);
        const pageText = stripHtmlToText(html);
        return {
          url,
          score: scoreSnippetRelevance(pageText, message),
          snippet: hideSource
            ? `Trusted internal B4U Esports information:\n${truncateText(pageText, 1100)}`
            : `Source: ${url}\nSnippet: ${truncateText(pageText, 1100)}`
        };
      } catch (error) {
        console.error("Chat grounding: failed to fetch static source:", url, error);
        return null;
      }
    })
  );

  return snippets
    .filter((item): item is { url: string; score: number; snippet: string } => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.snippet);
}

async function getChatWebsiteContext(message: string): Promise<string> {
  const appUrls = [
    PRIMARY_CHAT_SOURCE_URL,
    `${PRIMARY_CHAT_SOURCE_URL}/about`,
    `${PRIMARY_CHAT_SOURCE_URL}/faq`,
    `${PRIMARY_CHAT_SOURCE_URL}/terms`
  ];

  const appSnippets = await getStaticSiteSnippets(message, appUrls);

  if (appSnippets.length > 0) {
    return appSnippets.join("\n\n---\n\n");
  }

  const hiddenSnippets = await getStaticSiteSnippets(message, [
    SECONDARY_CHAT_SOURCE_URL,
    `${SECONDARY_CHAT_SOURCE_URL}/faqs/`,
    `${SECONDARY_CHAT_SOURCE_URL}/bhutanese-esports/`
  ], true);

  if (hiddenSnippets.length > 0) {
    return hiddenSnippets.join("\n\n---\n\n");
  }

  return `No official app grounding was available. Use official B4U Esports app details only.`;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  response: string;
  intent?: string;
  confidence?: number;
}

function buildRuleBasedFallback(message: string): AIResponse {
  const normalized = message.toLowerCase().trim();

  if (
    normalized.includes("didn't receive") ||
    normalized.includes("didnt receive") ||
    normalized.includes("not receive") ||
    normalized.includes("not delivered") ||
    normalized.includes("no token")
  ) {
    return {
      response:
        `Please wait a few minutes and confirm that your payment was completed.\n\n` +
        `If you already paid, make sure you uploaded the payment screenshot so the order can be verified.\n\n` +
        `If the tokens still have not arrived, contact support with your payment proof and order details:\n` +
        `Email: info@b4uesports.com\n` +
        `WhatsApp: Use the link in our website footer`,
      intent: "order_status",
      confidence: 0.7
    };
  }

  if (normalized.includes("failed") || normalized.includes("pending") || normalized.includes("cancel")) {
    return {
      response:
        `If your payment failed or is still pending, please do this:\n\n` +
        `1. Check whether the Pi payment was actually sent.\n` +
        `2. Upload your payment screenshot if the transfer was completed.\n` +
        `3. Wait a few minutes for verification.\n` +
        `4. If the issue continues, contact support with your transaction proof.\n\n` +
        `Email: info@b4uesports.com\n` +
        `WhatsApp: Use the link in our website footer`,
      intent: "issue",
      confidence: 0.7
    };
  }

  if (normalized.includes("buy") || normalized.includes("purchase") || normalized.includes("order")) {
    return {
      response:
        `To place an order on B4U Esports:\n\n` +
        `1. Select your game or service.\n` +
        `2. Choose the package you want.\n` +
        `3. Complete the Pi payment.\n` +
        `4. Upload your payment screenshot.\n` +
        `5. Wait a few minutes while the order is verified and processed.`,
      intent: "purchase",
      confidence: 0.7
    };
  }

  return {
    response:
      `I can help with purchases, Pi payments, screenshots, pending orders, failed transactions, and delivery issues.\n\n` +
      `You can ask things like:\n` +
      `- how to buy PUBG UC\n` +
      `- payment failed\n` +
      `- order still pending\n` +
      `- did not receive tokens\n\n` +
      `If you need direct support, email info@b4uesports.com.`,
    intent: "general",
    confidence: 0.6
  };
}

function getQuickReply(message: string): AIResponse | null {
  const normalized = message.toLowerCase().trim();

  if (/^(hi|hello|hey|hey there|good (morning|afternoon|evening)|greetings|yo|what's up)/i.test(normalized)) {
    return {
      response: `Hello! 👋 I'm the B4U Esports AI assistant. I can help you with token purchases, Pi payments, order status, and payment screenshot verification. What would you like to know?`,
      intent: "greeting",
      confidence: 0.95
    };
  }

  if (normalized.includes("thank") || normalized.includes("thanks")) {
    return {
      response: `You're welcome! 😊 If you need anything else about B4U Esports orders, Pi payments, or token delivery, just ask.`,
      intent: "gratitude",
      confidence: 0.95
    };
  }

  if (normalized.includes("how are you") || normalized.includes("how r u") || normalized.includes("how are u")) {
    return {
      response: `I'm doing great, thanks! Ready to help you with B4U Esports purchases, Pi payments, or order tracking.`,
      intent: "small_talk",
      confidence: 0.95
    };
  }

  return null;
}

function getDirectWebsiteAnswer(message: string, websiteContext: string): AIResponse | null {
  const normalized = message.toLowerCase();

  if (normalized.includes("founder") || normalized.includes("who founded")) {
    const founderMatch = websiteContext.match(/Founded by\s+([A-Z][A-Za-z\s]+?)(?:,|\.)/i);
    if (founderMatch?.[1]) {
      return {
        response: `👑 According to B4U Esports official information, B4U Esports was founded by ${founderMatch[1].trim()}.`,
        intent: "general",
        confidence: 0.95
      };
    }
  }

  if (normalized.includes("email") || normalized.includes("contact")) {
    const emailMatch = websiteContext.match(/[A-Z0-9._%+-]+@b4uesports\.com/i);
    if (emailMatch?.[0]) {
      return {
        response: `📧 You can contact B4U Esports at ${emailMatch[0]}.`,
        intent: "support",
        confidence: 0.9
      };
    }
  }

  return null;
}

/**
 * Send message to Google AI Studio (Gemini Flash)
 */
export async function getAIResponse(
  messages: ChatMessage[],
  userId?: string
): Promise<AIResponse> {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";

  try {
    const quickReply = getQuickReply(latestUserMessage);
    if (quickReply) {
      return quickReply;
    }

    if (!GOOGLE_AI_API_KEY) {
      console.error("❌ Google AI API key not configured");
      return buildRuleBasedFallback(latestUserMessage);
    }

    const websiteContext = await getChatWebsiteContext(latestUserMessage);
    const directWebsiteAnswer = getDirectWebsiteAnswer(latestUserMessage, websiteContext);

    if (directWebsiteAnswer) {
      return directWebsiteAnswer;
    }

    // Convert messages to Gemini format
    // Gemini uses "parts" array with "text" field
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Add system prompt with live website grounding
    const systemInstruction = {
      parts: [{
        text:
          `${SYSTEM_PROMPT}\n\n` +
          `Official website grounding for this conversation:\n${websiteContext}\n\n` +
          `Use the website grounding above for factual answers. If the answer is not supported there, say so honestly and direct the user to official support.`
      }]
    };

    const response = await fetch(GOOGLE_AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GOOGLE_AI_API_KEY
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Google AI API error:", errorData);
      return buildRuleBasedFallback(latestUserMessage);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!aiResponse) {
      console.error("AI service returned an empty response:", data);
      return {
        response: getFallbackResponse(),
        intent: "general",
        confidence: 0.5
      };
    }

    // Extract intent from response (simple heuristic)
    const intent = extractIntent(aiResponse);

    return {
      response: aiResponse,
      intent,
      confidence: 0.85 // Default confidence for AI responses
    };
  } catch (error) {
    console.error("❌ Error getting AI response:", error);
    return buildRuleBasedFallback(latestUserMessage);
  }
}

/**
 * Simple intent extraction from AI response
 */
function extractIntent(response: string): string {
  const lower = response.toLowerCase();
  
  if (lower.includes("payment") || lower.includes("pay")) return "payment";
  if (lower.includes("purchase") || lower.includes("buy")) return "purchase";
  if (lower.includes("order") || lower.includes("delivery")) return "order_status";
  if (lower.includes("refund") || lower.includes("failed")) return "issue";
  if (lower.includes("support") || lower.includes("contact")) return "support";
  if (lower.includes("token") || lower.includes("pi")) return "token_info";
  if (lower.includes("game") || lower.includes("pubg") || lower.includes("mlbb")) return "game_info";
  
  return "general";
}

/**
 * Fallback response when AI service is unavailable
 */
export function getFallbackResponse(): string {
  return `🤖 I'm currently experiencing high traffic. Please try again in a moment.

For immediate assistance:
📧 Email: info@b4uesports.com
💬 WhatsApp: Use the link in our website footer

How can I help you today?`;
}
