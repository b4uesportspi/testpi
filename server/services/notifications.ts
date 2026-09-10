import { db } from "../db.js";
import { appNotifications } from "../../shared/schema.js";

export async function sendNotification(userId: string, title: string, message: string, type: string = 'info') {
  try {
    await db.insert(appNotifications).values({
      userId,
      title,
      message,
      type,
      status: 'unread'
    });
    console.log(`Notification sent to ${userId}: ${title}`);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
