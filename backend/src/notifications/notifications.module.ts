import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailOutbox } from './entities/email-outbox.entity';
import { EMAIL_PROVIDER } from './email-provider';
import { NotificationsService } from './notifications.service';
import { SenderEmailProvider } from './sender-email.provider';
import { UnconfiguredEmailProvider } from './unconfigured-email.provider';
import { getEmailProviderName } from '../config/email-configuration';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { MarketingAllowanceModule } from '../marketing-allowance/marketing-allowance.module';
import { Newsletter } from '../newsletter/entities/newsletter.entity';
import { MARKETING_CONSENT_CHECKER } from './marketing-consent.checker';
import { TypeOrmMarketingConsentChecker } from './typeorm-marketing-consent.checker';

/**
 * Provider-independent transactional email.
 *
 * The adapter is bound here (mirroring the payment gateway pattern): with no
 * provider chosen yet the placeholder reports itself as unconfigured, so
 * notifications queue up safely and nothing can be reported as delivered.
 * `EMAIL_PROVIDER=sender` swaps in the Sender.net adapter; anything else keeps
 * the fail-closed placeholder.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EmailOutbox, Newsletter]),
    EmailSettingsModule,
    MarketingAllowanceModule,
  ],
  providers: [
    NotificationsService,
    {
      provide: MARKETING_CONSENT_CHECKER,
      useClass: TypeOrmMarketingConsentChecker,
    },
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService) =>
        getEmailProviderName(configService) === 'sender'
          ? new SenderEmailProvider(configService)
          : new UnconfiguredEmailProvider(),
      inject: [ConfigService],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
