import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id').notNull(),
  businessId: uuid('business_id').notNull(),
  status: text('status').default('draft').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(),
  referenceId: text('reference_id'),
  title: text('title').notNull(),
  description: text('description'),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: integer('unit_price').notNull(),
  subtotal: integer('subtotal').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    participantId: uuid('participant_id'),
    businessId: uuid('business_id'),
    recipientName: text('recipient_name'),
    recipientEmail: text('recipient_email'),
    publicToken: uuid('public_token').defaultRandom().notNull(),
    invoiceNumber: text('invoice_number').notNull(),
    issueDate: timestamp('issue_date').defaultNow().notNull(),
    dueDate: timestamp('due_date'),
    subtotal: integer('subtotal').notNull(),
    taxAmount: integer('tax_amount').default(0).notNull(),
    grandTotal: integer('grand_total').notNull(),
    paymentChannelId: text('payment_channel_id'),
    paymentChannelType: text('payment_channel_type'),
    paymentChannelLabel: text('payment_channel_label'),
    proofOfTransferUrl: text('proof_of_transfer_url'),
    status: text('status').default('waiting_for_payment').notNull(),
    paidAt: timestamp('paid_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    invoiceNumberUnique: uniqueIndex('invoices_invoice_number_unique').on(table.invoiceNumber),
    publicTokenUnique: uniqueIndex('invoices_public_token_unique').on(table.publicToken),
  })
);

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(),
  referenceId: text('reference_id'),
  title: text('title').notNull(),
  description: text('description'),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: integer('unit_price').notNull(),
  subtotal: integer('subtotal').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  paymentChannelId: text('payment_channel_id'),
  paymentChannelType: text('payment_channel_type'),
  paymentChannelLabel: text('payment_channel_label'),
  amount: integer('amount').notNull(),
  paidAt: timestamp('paid_at').defaultNow().notNull(),
  status: text('status').default('verified').notNull(),
  method: text('method'),
  referenceNumber: text('reference_number'),
  senderName: text('sender_name'),
  proofAssetId: uuid('proof_asset_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Disbursement (Pencairan Dana) ───────────────────────────────────────────

export const disbursementRequests = pgTable('disbursement_requests', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Pemohon
  requestedBy: uuid('requested_by').notNull(),
  requestedByName: text('requested_by_name').notNull(),

  // Tujuan
  purposeType: text('purpose_type').notNull(), // 'vendor' | 'operational' | 'refund' | 'other'
  purposeDescription: text('purpose_description').notNull(),
  vendorId: uuid('vendor_id'), // cross-schema ref ke public.vendors, no DB FK
  vendorAddonRef: text('vendor_addon_ref'), // opsional: ref add-on/zona

  // Jumlah
  requestedAmount: integer('requested_amount').notNull(),

  // Rekening tujuan
  destBankName: text('dest_bank_name').notNull(),
  destAccountNumber: text('dest_account_number').notNull(),
  destAccountName: text('dest_account_name').notNull(),

  // Approval
  status: text('status').default('draft').notNull(),
  // 'draft' | 'submitted' | 'approved' | 'rejected' | 'transferred' | 'cancelled'
  approvedBy: uuid('approved_by'),
  approvedByName: text('approved_by_name'),
  approvedAt: timestamp('approved_at'),
  rejectedBy: uuid('rejected_by'),
  rejectedByName: text('rejected_by_name'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),

  notes: text('notes'),
  eventId: uuid('event_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const disbursementTransfers = pgTable('disbursement_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => disbursementRequests.id, { onDelete: 'cascade' }),

  transferredAt: timestamp('transferred_at').notNull(),
  sourceChannelId: text('source_channel_id'), // payment channel uuid (opsional)
  sourceChannelLabel: text('source_channel_label'), // snapshot label

  destBankName: text('dest_bank_name').notNull(),
  destAccountNumber: text('dest_account_number').notNull(),
  destAccountName: text('dest_account_name').notNull(),

  grossAmount: integer('gross_amount').notNull(),
  transferFee: integer('transfer_fee').default(0).notNull(),
  netAmount: integer('net_amount').notNull(), // gross - fee

  proofAssetUrl: text('proof_asset_url'),

  transferredBy: uuid('transferred_by').notNull(),
  transferredByName: text('transferred_by_name').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Cashflow Ledger ─────────────────────────────────────────────────────────

export const cashflowLedger = pgTable('cashflow_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionDate: timestamp('transaction_date').defaultNow().notNull(),
  type: text('type').notNull(), // 'cash_in' | 'cash_out'
  category: text('category').notNull(),
  amount: integer('amount').notNull(),
  description: text('description').notNull(),
  referenceInvoiceId: uuid('reference_invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  referenceDisbursementId: uuid('reference_disbursement_id'), // no DB FK (same schema but defined after)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const orderRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  invoices: many(invoices),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const invoiceRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
  cashflowEntries: many(cashflowLedger),
}));

export const invoiceItemRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const invoicePaymentRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, { fields: [invoicePayments.invoiceId], references: [invoices.id] }),
}));

export const disbursementRequestRelations = relations(disbursementRequests, ({ one }) => ({
  transfer: one(disbursementTransfers, {
    fields: [disbursementRequests.id],
    references: [disbursementTransfers.requestId],
  }),
}));

export const disbursementTransferRelations = relations(disbursementTransfers, ({ one }) => ({
  request: one(disbursementRequests, {
    fields: [disbursementTransfers.requestId],
    references: [disbursementRequests.id],
  }),
}));

export const cashflowLedgerRelations = relations(cashflowLedger, ({ one }) => ({
  invoice: one(invoices, {
    fields: [cashflowLedger.referenceInvoiceId],
    references: [invoices.id],
  }),
  disbursement: one(disbursementRequests, {
    fields: [cashflowLedger.referenceDisbursementId],
    references: [disbursementRequests.id],
  }),
}));
