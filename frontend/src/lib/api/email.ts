import { request } from "./client";

export type EmailSetting = {
  key: string;
  enabled: boolean;
  description: string;
};

export type EmailActivityItem = {
  id: number;
  eventType: string;
  eventKey: string;
  orderId: number | null;
  orderReference: string | null;
  recipientEmail: string;
  recipientKind: string;
  subject: string;
  status: string;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
  updatedAt: string;
};

export type EmailActivityPage = {
  items: EmailActivityItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type EmailStats = {
  total: number;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  lastSuccessfulDelivery: string | null;
};

export type ProviderStatus = {
  provider: string;
  configured: boolean;
  senderConfigured: boolean;
  senderEmail: string | null;
  configHold: string | null;
};

export type TestEmailResult = {
  accepted: boolean;
  recipient: string;
  eventKey: string;
  queuedAt: string;
};

export type EmailSettingKey =
  | "order_confirmation"
  | "payment_confirmation"
  | "order_status_updates"
  | "cancellation_confirmation"
  | "admin_new_order";

export type UpdateEmailSetting = {
  key: EmailSettingKey;
  enabled: boolean;
};

export function listEmailSettings(): Promise<EmailSetting[]> {
  return request("GET", "/admin/email/settings");
}

export function updateEmailSetting(
  key: EmailSettingKey,
  enabled: boolean,
): Promise<{ key: string; enabled: boolean; updatedBy: number }> {
  return request("PATCH", `/admin/email/settings/${key}`, { enabled });
}

export function listEmailActivity({
  page = 1,
  limit = 25,
  status,
  eventType,
  recipient,
  from,
  to,
  search,
}: {
  page?: number;
  limit?: number;
  status?: string;
  eventType?: string;
  recipient?: string;
  from?: string;
  to?: string;
  search?: string;
} = {}): Promise<EmailActivityPage> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (status) params.set("status", status);
  if (eventType) params.set("eventType", eventType);
  if (recipient) params.set("recipient", recipient);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (search) params.set("search", search);

  return request("GET", `/admin/email/activity?${params.toString()}`);
}

export function getEmailActivity(id: number): Promise<EmailActivityItem> {
  return request("GET", `/admin/email/activity/${id}`);
}

export function getEmailStats(): Promise<EmailStats> {
  return request("GET", "/admin/email/stats");
}

export function getProviderStatus(): Promise<ProviderStatus> {
  return request("GET", "/admin/email/provider-status");
}

export function sendTestEmail(recipient: string): Promise<TestEmailResult> {
  return request("POST", "/admin/email/test", { recipient });
}
