import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Between } from 'typeorm';
import { CurrentCustomer } from '../auth/decorators/current-customer.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import type { Customer } from '../customers/entities/customer.entity';
import {
  getEmailProviderName,
  getEmailSender,
} from '../config/email-configuration';
import { EmailOutbox } from '../notifications/entities/email-outbox.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EmailSettingsService,
  EMAIL_SETTING_KEYS,
} from './email-settings.service';
import { ListEmailActivityQueryDto } from './dto/list-email-activity-query.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { UpdateEmailSettingDto } from './dto/update-email-setting.dto';
import type { EmailSettingKey } from './email-settings.service';

const TEST_EMAIL_SUBJECT = 'Aapulki — Test email';

/**
 * Central email management for the Aapulki studio.
 *
 * Every route requires an administrator session; writes additionally require
 * the CSRF token and the configured origin.
 */
@Controller('admin/email')
@UseGuards(AdminGuard)
export class AdminEmailController {
  constructor(
    private readonly settingsService: EmailSettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // ------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------

  @Get('settings')
  async listSettings() {
    const settings = await this.settingsService.getAll();
    return settings.map((setting) => ({
      key: setting.key,
      enabled: setting.enabled,
      description: setting.description,
    }));
  }

  @Patch('settings/:key')
  @UseGuards(CsrfGuard)
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateEmailSettingDto,
    @CurrentCustomer() customer: Customer,
  ) {
    if (!EMAIL_SETTING_KEYS.includes(key as EmailSettingKey)) {
      throw new NotFoundException(`Unknown email setting "${key}".`);
    }

    await this.settingsService.update(key as EmailSettingKey, dto.enabled);

    return {
      key,
      enabled: dto.enabled,
      updatedBy: customer.id,
    };
  }

  // ------------------------------------------------------------------
  // Activity history
  // ------------------------------------------------------------------

  @Get('activity')
  async listActivity(@Query() query: ListEmailActivityQueryDto) {
    const repository = this.dataSource.getRepository(EmailOutbox);

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.eventType) {
      where.eventType = query.eventType;
    }

    // Date range on created_at.
    if (query.from || query.to) {
      where.created_at = Between(
        query.from ?? '1000-01-01T00:00:00.000Z',
        query.to ?? '9999-12-31T23:59:59.999Z',
      );
    }

    const [rows, total] = await repository.findAndCount({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Fetch related order references for rows that have an order_id.
    const orderIds = [
      ...new Set(rows.map((row) => row.orderId).filter(Boolean)),
    ] as number[];
    const orderReferences = new Map<number, string>();
    if (orderIds.length > 0) {
      const orders = await this.dataSource
        .createQueryBuilder()
        .select('id', 'id')
        .addSelect('order_reference', 'orderReference')
        .from('orders', 'orders')
        .where('id IN (:...ids)', { ids: orderIds })
        .getRawMany<{ id: number; orderReference: string }>();
      for (const order of orders) {
        orderReferences.set(order.id, order.orderReference);
      }
    }

    // Apply substring recipient and search filters (findAndCount uses `=`,
    // so `%…%` values would not match substrings).
    const recipientNeedle = query.recipient?.toLowerCase() ?? '';
    const searchNeedle = query.search?.trim().toLowerCase() ?? '';

    const items = rows
      .filter((row) => {
        if (
          recipientNeedle &&
          !row.recipientEmail.toLowerCase().includes(recipientNeedle)
        ) {
          return false;
        }
        if (searchNeedle) {
          const haystack = [
            row.subject,
            row.recipientEmail,
            row.eventKey,
            orderReferences.get(row.orderId ?? 0) ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(searchNeedle)) {
            return false;
          }
        }
        return true;
      })
      .map((row) => ({
        id: row.id,
        eventType: row.eventType,
        eventKey: row.eventKey,
        orderId: row.orderId,
        orderReference: row.orderId
          ? (orderReferences.get(row.orderId) ?? null)
          : null,
        recipientEmail: row.recipientEmail,
        recipientKind: row.recipientKind,
        subject: row.subject,
        status: row.status,
        attempts: row.attempts,
        lastError: row.lastError,
        providerMessageId: row.providerMessageId,
        createdAt: row.createdAt,
        sentAt: row.sentAt,
        updatedAt: row.updatedAt,
      }));

    return {
      items,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  @Get('activity/:id')
  async activityDetail(@Param('id', ParseIntPipe) id: number) {
    const repository = this.dataSource.getRepository(EmailOutbox);
    const row = await repository.findOne({ where: { id } });

    if (!row) {
      throw new NotFoundException(`Email record ${id} not found.`);
    }

    let orderReference: string | null = null;
    if (row.orderId) {
      const order = await this.dataSource
        .createQueryBuilder()
        .select('order_reference', 'orderReference')
        .from('orders', 'orders')
        .where('id = :id', { id: row.orderId })
        .getRawOne<{ orderReference: string }>();
      if (order) {
        orderReference = order.orderReference;
      }
    }

    return {
      id: row.id,
      eventType: row.eventType,
      eventKey: row.eventKey,
      orderId: row.orderId,
      orderReference,
      recipientEmail: row.recipientEmail,
      recipientKind: row.recipientKind,
      subject: row.subject,
      htmlBody: row.htmlBody,
      textBody: row.textBody,
      status: row.status,
      attempts: row.attempts,
      lastError: row.lastError,
      providerMessageId: row.providerMessageId,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      lockedAt: row.lockedAt,
      nextAttemptAt: row.nextAttemptAt,
      updatedAt: row.updatedAt,
    };
  }

  // ------------------------------------------------------------------
  // Delivery statistics
  // ------------------------------------------------------------------

  @Get('stats')
  async stats() {
    const repository = this.dataSource.getRepository(EmailOutbox);

    const [total, pending, sending, sent, failed] = await Promise.all([
      repository.count(),
      repository.count({ where: { status: 'pending' } }),
      repository.count({ where: { status: 'sending' } }),
      repository.count({ where: { status: 'sent' } }),
      repository.count({ where: { status: 'failed' } }),
    ]);

    const lastSent = await repository.findOne({
      where: { status: 'sent' },
      order: { sentAt: 'DESC', id: 'DESC' },
    });

    return {
      total,
      pending,
      sending,
      sent,
      failed,
      lastSuccessfulDelivery: lastSent?.sentAt ?? null,
    };
  }

  // ------------------------------------------------------------------
  // Provider operational status
  // ------------------------------------------------------------------

  @Get('provider-status')
  providerStatus() {
    return this.getProviderStatus();
  }

  private getProviderStatus() {
    const providerName = getEmailProviderName(this.configService);
    const sender = getEmailSender(this.configService);
    const configured = providerName !== null;

    return {
      provider: providerName ?? 'none',
      configured,
      senderConfigured: sender !== null,
      senderEmail: sender ? sender.email : null,
      configHold: configured
        ? !sender
          ? 'Sender address is not configured.'
          : null
        : 'Email provider is not configured.',
    };
  }

  // ------------------------------------------------------------------
  // Test email
  // ------------------------------------------------------------------

  @Post('test')
  @UseGuards(CsrfGuard)
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const subject = TEST_EMAIL_SUBJECT;
    const rendered = this.renderTestEmail(dto.recipient, subject);

    const eventKey = `${TEST_EMAIL_SUBJECT.toLowerCase().replace(/\s+/g, '_')}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    await this.notificationsService.enqueueNewsletterConfirmation({
      eventKey,
      email: dto.recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    return {
      accepted: true,
      recipient: dto.recipient,
      eventKey,
      queuedAt: new Date(),
    };
  }

  private renderTestEmail(recipient: string, subject: string) {
    const now = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const escapedRecipient = recipient
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f7f4ee;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4ee;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#fdfcf9;border:1px solid #e4dfd2;border-radius:14px;border-collapse:separate;overflow:hidden;">
            <tr>
              <td style="background-color:#f0d9d4;padding:20px 28px;border-bottom:1px solid #e4dfd2;">
                <span style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#1c1c1c;">Aapulki</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:600;color:#1c1c1c;">Test email from Aapulki</h1>
                <p style="margin:0 0 16px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c1c1c;">Hello, this is a test email from the Aapulki studio. It was sent at ${now}.</p>
                <p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6f6a62;">If you received this, the transactional email provider is working correctly.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background-color:#f7f4ee;border-top:1px solid #e4dfd2;">
                <p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6f6a62;">Sent to ${escapedRecipient}. This is a test message and does not consume any marketing allowance.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim();
    const text = `Aapulki — Test email\n\nHello, this is a test email from the Aapulki studio. It was sent at ${now}.\n\nIf you received this, the transactional email provider is working correctly.\n\nSent to ${recipient}. This is a test message and does not consume any marketing allowance.`;

    return { subject, html, text };
  }
}
