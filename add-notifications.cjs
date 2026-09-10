const fs = require('fs');

let schema = fs.readFileSync('shared/schema.ts', 'utf8');

const appNotificationsDef = `
export const appNotifications = pgTable("app_notifications", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // purchase, tournament, system, etc.
  status: text("status").notNull().default("unread"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql\`'{}'::jsonb\`),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_app_notifications_user").on(table.userId),
}));

export const appNotificationsRelations = relations(appNotifications, ({ one }) => ({
  user: one(users, {
    fields: [appNotifications.userId],
    references: [users.id],
  }),
}));

export const insertAppNotificationSchema = createInsertSchema(appNotifications).omit({
  id: true,
  readAt: true,
  createdAt: true,
});
export type AppNotification = typeof appNotifications.$inferSelect;
export type InsertAppNotification = z.infer<typeof insertAppNotificationSchema>;
`;

if (!schema.includes('appNotifications')) {
  schema = schema + '\n' + appNotificationsDef;
  fs.writeFileSync('shared/schema.ts', schema);
  console.log('Added appNotifications to schema.ts');
} else {
  console.log('Already exists');
}
