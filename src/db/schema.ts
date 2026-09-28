import { relations } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ─── Auth.js tables (shape required by @auth/drizzle-adapter) ──────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
    // Not used by Auth.js itself: brute-force and resend protection (see server/verification-tokens.ts).
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─── Households ────────────────────────────────────────────────────────────────

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt,
});

export const memberRoles = ["owner", "member"] as const;
export type MemberRole = (typeof memberRoles)[number];

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull(),
    createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.householdId, t.userId] }),
    // MVP: a user belongs to exactly one household.
    unique("household_members_user_unique").on(t.userId),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedBy: text("used_by").references(() => users.id, { onDelete: "set null" }),
    createdAt,
  },
  (t) => [index("invites_household_idx").on(t.householdId)],
);

// ─── Vehicles & maintenance ────────────────────────────────────────────────────

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year"),
    plate: text("plate"),
    trackedSince: date("tracked_since").notNull(),
    createdAt,
  },
  (t) => [index("vehicles_household_idx").on(t.householdId)],
);

export const odometerReadings = pgTable(
  "odometer_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    km: integer("km").notNull(),
    date: date("date").notNull(),
    serviceRecordId: uuid("service_record_id").references(() => serviceRecords.id, {
      onDelete: "cascade",
    }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt,
  },
  (t) => [
    index("odometer_readings_vehicle_idx").on(t.vehicleId, t.date),
    unique("odometer_readings_service_unique").on(t.serviceRecordId),
    check("odometer_readings_km_nonneg", sql`${t.km} >= 0`),
  ],
);

export const maintenanceItems = pgTable(
  "maintenance_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    intervalKm: integer("interval_km"),
    intervalMonths: integer("interval_months"),
    sort: integer("sort").notNull().default(0),
    createdAt,
  },
  (t) => [index("maintenance_items_vehicle_idx").on(t.vehicleId)],
);

export const serviceRecords = pgTable(
  "service_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    odometer: integer("odometer").notNull(),
    workshop: text("workshop"),
    totalCost: integer("total_cost").notNull().default(0),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt,
  },
  (t) => [index("service_records_vehicle_idx").on(t.vehicleId, t.date)],
);

export const serviceRecordItems = pgTable(
  "service_record_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceRecordId: uuid("service_record_id")
      .notNull()
      .references(() => serviceRecords.id, { onDelete: "cascade" }),
    maintenanceItemId: uuid("maintenance_item_id").references(() => maintenanceItems.id, {
      onDelete: "set null",
    }),
    label: text("label").notNull(),
    cost: integer("cost"),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    index("service_record_items_record_idx").on(t.serviceRecordId),
    index("service_record_items_item_idx").on(t.maintenanceItemId),
  ],
);

// ─── Documents & attachments ───────────────────────────────────────────────────

export const documentTypes = ["insurance", "stnk_annual", "stnk_5yr", "other"] as const;
export type DocumentType = (typeof documentTypes)[number];

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    type: text("type").$type<DocumentType>().notNull(),
    title: text("title").notNull(),
    expiresOn: date("expires_on").notNull(),
    remindDaysBefore: integer("remind_days_before").notNull().default(30),
    notes: text("notes"),
    createdAt,
  },
  (t) => [index("documents_vehicle_idx").on(t.vehicleId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    serviceRecordId: uuid("service_record_id").references(() => serviceRecords.id, {
      onDelete: "cascade",
    }),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [
    index("attachments_household_idx").on(t.householdId),
    index("attachments_service_idx").on(t.serviceRecordId),
    index("attachments_document_idx").on(t.documentId),
  ],
);

// ─── Push ──────────────────────────────────────────────────────────────────────

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt,
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("notification_log_household_key_unique").on(t.householdId, t.key)],
);

// ─── Relations (for the relational query API) ─────────────────────────────────

export const serviceRecordsRelations = relations(serviceRecords, ({ many, one }) => ({
  items: many(serviceRecordItems),
  attachments: many(attachments),
  vehicle: one(vehicles, { fields: [serviceRecords.vehicleId], references: [vehicles.id] }),
}));

export const serviceRecordItemsRelations = relations(serviceRecordItems, ({ one }) => ({
  record: one(serviceRecords, {
    fields: [serviceRecordItems.serviceRecordId],
    references: [serviceRecords.id],
  }),
}));

export const documentsRelations = relations(documents, ({ many, one }) => ({
  attachments: many(attachments),
  vehicle: one(vehicles, { fields: [documents.vehicleId], references: [vehicles.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  serviceRecord: one(serviceRecords, {
    fields: [attachments.serviceRecordId],
    references: [serviceRecords.id],
  }),
  document: one(documents, { fields: [attachments.documentId], references: [documents.id] }),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  serviceRecords: many(serviceRecords),
  documents: many(documents),
  maintenanceItems: many(maintenanceItems),
}));
