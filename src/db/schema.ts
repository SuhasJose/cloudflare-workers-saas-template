import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  name: text('name'),
  created_at: integer('created_at'),
})

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name'),
  owner_id: text('owner_id'),
  created_at: integer('created_at'),
})

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  team_id: text('team_id'),
  provider: text('provider'),
  provider_subscription_id: text('provider_subscription_id').unique(),
  plan_id: text('plan_id'),
  status: text('status'),
  current_period_end: integer('current_period_end'),
  metadata: text('metadata'),
  created_at: integer('created_at'),
  updated_at: integer('updated_at'),
})

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  subscription_id: text('subscription_id'),
  provider_invoice_id: text('provider_invoice_id').unique(),
  amount: integer('amount'),
  currency: text('currency'),
  status: text('status'),
  created_at: integer('created_at'),
})

export const provider_events = sqliteTable('provider_events', {
  id: integer('id').primaryKey(),
  provider: text('provider'),
  event_id: text('event_id'),
  payload: text('payload'),
  received_at: integer('received_at'),
})
