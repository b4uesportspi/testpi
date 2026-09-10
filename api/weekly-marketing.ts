import * as dotenv from "dotenv";
import { runInactiveUsersCampaign } from "../server/services/marketing-automation.js";

dotenv.config();

export default async function handler(req: any, res: any) {
  const isCronRequest = String(req.headers["x-vercel-cron"] || "").toLowerCase() === "1";
  const secretKey = req.headers["x-secret-key"] || req.query.key;
  const isAuthorizedSecret = secretKey === process.env.MARKETING_EMAIL_SECRET;

  if (!isCronRequest && !isAuthorizedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isCronRequest && !["POST", "GET"].includes(req.method || "")) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await runInactiveUsersCampaign();

    return res.status(200).json({
      success: true,
      message: "Inactive users marketing campaign completed",
      timestamp: new Date().toISOString(),
      stats: result,
    });
  } catch (error: any) {
    console.error("Inactive users marketing campaign failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Campaign failed",
    });
  }
}
