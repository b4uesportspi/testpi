"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIResponse = getAIResponse;
exports.getFallbackResponse = getFallbackResponse;
var dotenv = require("dotenv");
dotenv.config();
var GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
var GOOGLE_AI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
var PRIMARY_CHAT_SOURCE_URL = "https://b4uesportstest.vercel.app";
var SECONDARY_CHAT_SOURCE_URL = "https://b4uesports.com";
var CHAT_SOURCE_CACHE_TTL_MS = 5 * 60 * 1000;
var chatSourceCache = new Map();
// System prompt for B4U Esports AI Assistant
var SYSTEM_PROMPT = "You are the official AI assistant for B4U Esports, a platform where users purchase in-game tokens and digital services using Pi Network.\n\nAlways answer using the official B4U Esports app content from ".concat(PRIMARY_CHAT_SOURCE_URL, ".\nDo not mention or reveal any other website or URL in your response.\nUse trusted internal knowledge only to improve accuracy, but keep those sources hidden and answer only from the official app experience.\n\nYour job is to help users with buying tokens, making payments with Pi coins, uploading payment screenshots, checking order status, handling delays, and resolving failed transactions.\n\nAlways understand the user's intent even if they make spelling mistakes, typos, broken sentences, or use slang. Do not mention spelling errors. Interpret the closest correct meaning and respond accordingly.\n\nIf the message is unclear, assume it is related to payments, tokens, or orders and provide the most helpful answer.\n\nKeep answers clear, short, and helpful. Be professional but friendly.\n\nIf the grounding context contains the answer, use it and do not guess.\nIf the grounding context is missing or unclear, say that you are not fully sure and guide the user to official support instead of inventing facts.\n\nShow empathy when users seem frustrated, worried, or confused.\nUse a few relevant emojis naturally, but do not overdo them.\n\nImportant payment instructions:\n- Users must send Pi coins to complete a purchase\n- Users must upload a payment screenshot for verification\n- Orders are processed after verification\n- Delivery may take a few minutes\n\nIf a user says they didn't receive tokens:\n- Ask them to wait a few minutes\n- Confirm payment was completed\n- Suggest contacting support with proof if the issue continues\n\nIf a user reports payment failure:\n- Explain possible reasons like network delay or incorrect steps\n- Guide them on how to retry properly\n\nNever give false information. If unsure, guide the user to contact support.\n\nYou act as a reliable and smart support agent for B4U Esports.\n\nContact Information:\n- Email: info@b4uesports.com\n- WhatsApp: Available through website footer\n- Support hours: 24/7 for transaction issues\n\nSupported Games & Services:\n- PUBG Mobile (UC packages)\n- Mobile Legends (Diamonds)\n- Clash of Clans (Gold Pass)\n- Roblox (Robux)\n- NEW STATE (NC)\n- FREE FIRE (Diamonds)\n- TikTok (Coins, Followers, Views)\n- YouTube (Subscribers, Watch Time)\n- Facebook (Likes, Followers)\n- Instagram (Followers)\n- Netflix Subscriptions\n- Canva Pro Subscriptions\n\nAlways respond in a helpful, professional manner and prioritize user satisfaction while maintaining honesty about limitations.");
function decodeHtmlEntities(text) {
    return text
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}
function stripHtmlToText(html) {
    return decodeHtmlEntities(html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim();
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return "".concat(text.slice(0, maxLength - 3).trim(), "...");
}
function getKeywordStems(message) {
    return Array.from(new Set(message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(function (token) { return token.length >= 4; })
        .map(function (token) { return token.slice(0, 5); })));
}
function scoreSnippetRelevance(text, message) {
    var lowerText = text.toLowerCase();
    return getKeywordStems(message).reduce(function (score, stem) { return score + (lowerText.includes(stem) ? 1 : 0); }, 0);
}
function fetchChatSource(url) {
    return __awaiter(this, void 0, void 0, function () {
        var cached, response, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cached = chatSourceCache.get(url);
                    if (cached && cached.expiresAt > Date.now()) {
                        return [2 /*return*/, cached.value];
                    }
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (compatible; B4U-Esports-AI/1.0)"
                            }
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Failed to fetch ".concat(url, ": ").concat(response.status));
                    }
                    return [4 /*yield*/, response.text()];
                case 2:
                    text = _a.sent();
                    chatSourceCache.set(url, {
                        value: text,
                        expiresAt: Date.now() + CHAT_SOURCE_CACHE_TTL_MS
                    });
                    return [2 /*return*/, text];
            }
        });
    });
}
function getWordPressSearchSnippets(query) {
    return __awaiter(this, void 0, void 0, function () {
        var searchUrl, payload, results, snippets, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    searchUrl = "".concat(SECONDARY_CHAT_SOURCE_URL, "/wp-json/wp/v2/search?search=").concat(encodeURIComponent(query), "&per_page=3");
                    return [4 /*yield*/, fetchChatSource(searchUrl)];
                case 1:
                    payload = _a.sent();
                    results = JSON.parse(payload);
                    if (!Array.isArray(results)) {
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, Promise.all(results
                            .filter(function (item) { return (item === null || item === void 0 ? void 0 : item.url) && (item === null || item === void 0 ? void 0 : item.title); })
                            .slice(0, 2)
                            .map(function (item) { return __awaiter(_this, void 0, void 0, function () {
                            var pageHtml, pageText, error_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, fetchChatSource(String(item.url))];
                                    case 1:
                                        pageHtml = _a.sent();
                                        pageText = stripHtmlToText(pageHtml);
                                        return [2 /*return*/, "Source: ".concat(item.url, "\nTitle: ").concat(item.title, "\nSnippet: ").concat(truncateText(pageText, 800))];
                                    case 2:
                                        error_2 = _a.sent();
                                        console.error("Chat grounding: failed to fetch WordPress result page:", item === null || item === void 0 ? void 0 : item.url, error_2);
                                        return [2 /*return*/, "Source: ".concat(item.url, "\nTitle: ").concat(item.title)];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    snippets = _a.sent();
                    return [2 /*return*/, snippets.filter(Boolean)];
                case 3:
                    error_1 = _a.sent();
                    console.error("Chat grounding: WordPress search failed:", error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getStaticSiteSnippets(message_1, urls_1) {
    return __awaiter(this, arguments, void 0, function (message, urls, hideSource) {
        var snippets;
        var _this = this;
        if (hideSource === void 0) { hideSource = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(urls.map(function (url) { return __awaiter(_this, void 0, void 0, function () {
                        var html, pageText, error_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, fetchChatSource(url)];
                                case 1:
                                    html = _a.sent();
                                    pageText = stripHtmlToText(html);
                                    return [2 /*return*/, {
                                            url: url,
                                            score: scoreSnippetRelevance(pageText, message),
                                            snippet: hideSource
                                                ? "Trusted internal B4U Esports information:\n".concat(truncateText(pageText, 1100))
                                                : "Source: ".concat(url, "\nSnippet: ").concat(truncateText(pageText, 1100))
                                        }];
                                case 2:
                                    error_3 = _a.sent();
                                    console.error("Chat grounding: failed to fetch static source:", url, error_3);
                                    return [2 /*return*/, null];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }))];
                case 1:
                    snippets = _a.sent();
                    return [2 /*return*/, snippets
                            .filter(function (item) { return Boolean(item); })
                            .sort(function (a, b) { return b.score - a.score; })
                            .slice(0, 3)
                            .map(function (item) { return item.snippet; })];
            }
        });
    });
}
function getChatWebsiteContext(message) {
    return __awaiter(this, void 0, void 0, function () {
        var appUrls, appSnippets, hiddenSnippets;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    appUrls = [
                        PRIMARY_CHAT_SOURCE_URL,
                        "".concat(PRIMARY_CHAT_SOURCE_URL, "/about"),
                        "".concat(PRIMARY_CHAT_SOURCE_URL, "/faq"),
                        "".concat(PRIMARY_CHAT_SOURCE_URL, "/terms")
                    ];
                    return [4 /*yield*/, getStaticSiteSnippets(message, appUrls)];
                case 1:
                    appSnippets = _a.sent();
                    if (appSnippets.length > 0) {
                        return [2 /*return*/, appSnippets.join("\n\n---\n\n")];
                    }
                    return [4 /*yield*/, getStaticSiteSnippets(message, [
                            SECONDARY_CHAT_SOURCE_URL,
                            "".concat(SECONDARY_CHAT_SOURCE_URL, "/faqs/"),
                            "".concat(SECONDARY_CHAT_SOURCE_URL, "/bhutanese-esports/")
                        ], true)];
                case 2:
                    hiddenSnippets = _a.sent();
                    if (hiddenSnippets.length > 0) {
                        return [2 /*return*/, hiddenSnippets.join("\n\n---\n\n")];
                    }
                    return [2 /*return*/, "No official app grounding was available. Use official B4U Esports app details only."];
            }
        });
    });
}
function buildRuleBasedFallback(message) {
    var normalized = message.toLowerCase().trim();
    if (normalized.includes("didn't receive") ||
        normalized.includes("didnt receive") ||
        normalized.includes("not receive") ||
        normalized.includes("not delivered") ||
        normalized.includes("no token")) {
        return {
            response: "Please wait a few minutes and confirm that your payment was completed.\n\n" +
                "If you already paid, make sure you uploaded the payment screenshot so the order can be verified.\n\n" +
                "If the tokens still have not arrived, contact support with your payment proof and order details:\n" +
                "Email: info@b4uesports.com\n" +
                "WhatsApp: Use the link in our website footer",
            intent: "order_status",
            confidence: 0.7
        };
    }
    if (normalized.includes("failed") || normalized.includes("pending") || normalized.includes("cancel")) {
        return {
            response: "If your payment failed or is still pending, please do this:\n\n" +
                "1. Check whether the Pi payment was actually sent.\n" +
                "2. Upload your payment screenshot if the transfer was completed.\n" +
                "3. Wait a few minutes for verification.\n" +
                "4. If the issue continues, contact support with your transaction proof.\n\n" +
                "Email: info@b4uesports.com\n" +
                "WhatsApp: Use the link in our website footer",
            intent: "issue",
            confidence: 0.7
        };
    }
    if (normalized.includes("buy") || normalized.includes("purchase") || normalized.includes("order")) {
        return {
            response: "To place an order on B4U Esports:\n\n" +
                "1. Select your game or service.\n" +
                "2. Choose the package you want.\n" +
                "3. Complete the Pi payment.\n" +
                "4. Upload your payment screenshot.\n" +
                "5. Wait a few minutes while the order is verified and processed.",
            intent: "purchase",
            confidence: 0.7
        };
    }
    return {
        response: "I can help with purchases, Pi payments, screenshots, pending orders, failed transactions, and delivery issues.\n\n" +
            "You can ask things like:\n" +
            "- how to buy PUBG UC\n" +
            "- payment failed\n" +
            "- order still pending\n" +
            "- did not receive tokens\n\n" +
            "If you need direct support, email info@b4uesports.com.",
        intent: "general",
        confidence: 0.6
    };
}
function getQuickReply(message) {
    var normalized = message.toLowerCase().trim();
    if (/^(hi|hello|hey|hey there|good (morning|afternoon|evening)|greetings|yo|what's up)/i.test(normalized)) {
        return {
            response: "Hello! \uD83D\uDC4B I'm the B4U Esports AI assistant. I can help you with token purchases, Pi payments, order status, and payment screenshot verification. What would you like to know?",
            intent: "greeting",
            confidence: 0.95
        };
    }
    if (normalized.includes("thank") || normalized.includes("thanks")) {
        return {
            response: "You're welcome! \uD83D\uDE0A If you need anything else about B4U Esports orders, Pi payments, or token delivery, just ask.",
            intent: "gratitude",
            confidence: 0.95
        };
    }
    if (normalized.includes("how are you") || normalized.includes("how r u") || normalized.includes("how are u")) {
        return {
            response: "I'm doing great, thanks! Ready to help you with B4U Esports purchases, Pi payments, or order tracking.",
            intent: "small_talk",
            confidence: 0.95
        };
    }
    return null;
}
function getDirectWebsiteAnswer(message, websiteContext) {
    var normalized = message.toLowerCase();
    if (normalized.includes("founder") || normalized.includes("who founded")) {
        var founderMatch = websiteContext.match(/Founded by\s+([A-Z][A-Za-z\s]+?)(?:,|\.)/i);
        if (founderMatch === null || founderMatch === void 0 ? void 0 : founderMatch[1]) {
            return {
                response: "\uD83D\uDC51 According to B4U Esports official information, B4U Esports was founded by ".concat(founderMatch[1].trim(), "."),
                intent: "general",
                confidence: 0.95
            };
        }
    }
    if (normalized.includes("email") || normalized.includes("contact")) {
        var emailMatch = websiteContext.match(/[A-Z0-9._%+-]+@b4uesports\.com/i);
        if (emailMatch === null || emailMatch === void 0 ? void 0 : emailMatch[0]) {
            return {
                response: "\uD83D\uDCE7 You can contact B4U Esports at ".concat(emailMatch[0], "."),
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
function getAIResponse(messages, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var latestUserMessage, quickReply, websiteContext, directWebsiteAnswer, contents, systemInstruction, response, errorData, data, aiResponse, intent, error_4;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    latestUserMessage = ((_a = __spreadArray([], messages, true).reverse().find(function (message) { return message.role === "user"; })) === null || _a === void 0 ? void 0 : _a.content) || "";
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 7, , 8]);
                    quickReply = getQuickReply(latestUserMessage);
                    if (quickReply) {
                        return [2 /*return*/, quickReply];
                    }
                    if (!GOOGLE_AI_API_KEY) {
                        console.error("❌ Google AI API key not configured");
                        return [2 /*return*/, buildRuleBasedFallback(latestUserMessage)];
                    }
                    return [4 /*yield*/, getChatWebsiteContext(latestUserMessage)];
                case 2:
                    websiteContext = _h.sent();
                    directWebsiteAnswer = getDirectWebsiteAnswer(latestUserMessage, websiteContext);
                    if (directWebsiteAnswer) {
                        return [2 /*return*/, directWebsiteAnswer];
                    }
                    contents = messages.map(function (msg) { return ({
                        role: msg.role === "assistant" ? "model" : "user",
                        parts: [{ text: msg.content }]
                    }); });
                    systemInstruction = {
                        parts: [{
                                text: "".concat(SYSTEM_PROMPT, "\n\n") +
                                    "Official website grounding for this conversation:\n".concat(websiteContext, "\n\n") +
                                    "Use the website grounding above for factual answers. If the answer is not supported there, say so honestly and direct the user to official support."
                            }]
                    };
                    return [4 /*yield*/, fetch(GOOGLE_AI_API_URL, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-goog-api-key": GOOGLE_AI_API_KEY
                            },
                            body: JSON.stringify({
                                contents: contents,
                                systemInstruction: systemInstruction,
                                generationConfig: {
                                    temperature: 0.7,
                                    topK: 40,
                                    topP: 0.95,
                                    maxOutputTokens: 500
                                }
                            })
                        })];
                case 3:
                    response = _h.sent();
                    if (!!response.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                case 4:
                    errorData = _h.sent();
                    console.error("❌ Google AI API error:", errorData);
                    return [2 /*return*/, buildRuleBasedFallback(latestUserMessage)];
                case 5: return [4 /*yield*/, response.json()];
                case 6:
                    data = _h.sent();
                    aiResponse = ((_g = (_f = (_e = (_d = (_c = (_b = data.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) === null || _g === void 0 ? void 0 : _g.trim()) || "";
                    if (!aiResponse) {
                        console.error("AI service returned an empty response:", data);
                        return [2 /*return*/, {
                                response: getFallbackResponse(),
                                intent: "general",
                                confidence: 0.5
                            }];
                    }
                    intent = extractIntent(aiResponse);
                    return [2 /*return*/, {
                            response: aiResponse,
                            intent: intent,
                            confidence: 0.85 // Default confidence for AI responses
                        }];
                case 7:
                    error_4 = _h.sent();
                    console.error("❌ Error getting AI response:", error_4);
                    return [2 /*return*/, buildRuleBasedFallback(latestUserMessage)];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Simple intent extraction from AI response
 */
function extractIntent(response) {
    var lower = response.toLowerCase();
    if (lower.includes("payment") || lower.includes("pay"))
        return "payment";
    if (lower.includes("purchase") || lower.includes("buy"))
        return "purchase";
    if (lower.includes("order") || lower.includes("delivery"))
        return "order_status";
    if (lower.includes("refund") || lower.includes("failed"))
        return "issue";
    if (lower.includes("support") || lower.includes("contact"))
        return "support";
    if (lower.includes("token") || lower.includes("pi"))
        return "token_info";
    if (lower.includes("game") || lower.includes("pubg") || lower.includes("mlbb"))
        return "game_info";
    return "general";
}
/**
 * Fallback response when AI service is unavailable
 */
function getFallbackResponse() {
    return "\uD83E\uDD16 I'm currently experiencing high traffic. Please try again in a moment.\n\nFor immediate assistance:\n\uD83D\uDCE7 Email: info@b4uesports.com\n\uD83D\uDCAC WhatsApp: Use the link in our website footer\n\nHow can I help you today?";
}
