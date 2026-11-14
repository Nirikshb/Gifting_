import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { AudienceService } from './audience.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';

/**
 * Campaign management.
 *
 * Campaigns are draftable, schedulable and cancellable definitions of
 * marketing email content. Immediate sends and scheduled execution both reuse
 * the same outbox/consent/allowance/dispatch/reconciliation pipeline.
 */
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService, AudienceService, CampaignSchedulerService],
  exports: [CampaignService, AudienceService],
})
export class CampaignModule {}
