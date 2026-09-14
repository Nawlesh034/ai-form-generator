
import { pgTable, serial, varchar, text, integer, boolean } from "drizzle-orm/pg-core";

export const JsonForms = pgTable('JsonForms', {
    id: serial('id').primaryKey().notNull(),
    jsonForm: text('jsonform').notNull(),
    theme: varchar('theme'),
    CreatedBy: varchar('createdBy').notNull(),
    CreatedAt: varchar('createdAt').notNull(),
    enabledSignIn: boolean('enabledSignIn').default(false),
});

export const userResponse = pgTable('userResponse', {
    id: serial('id').primaryKey(),
    jsonResponse: text('jsonResponse').notNull(),
    CreatedBy: varchar('createdBy').default('anonymous'),
    CreatedAt: varchar('createdAt').notNull(),
    refForm: integer('refForm').references(() => JsonForms.id, { onDelete: 'cascade' })
});


export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),

  clerkUserId: varchar("clerkUserId").notNull(),

  stripeCustomerId: varchar("stripeCustomerId").notNull(),

  stripeSubscriptionId: varchar("stripeSubscriptionId").notNull().unique(),

  stripePriceId: varchar("stripePriceId").notNull(),

  plan: varchar("plan").notNull(),

  status: varchar("status").notNull(),

  createdAt: varchar("createdAt").notNull(),

  updatedAt: varchar("updatedAt").notNull(),
});