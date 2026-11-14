import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignService } from './campaign.service';

export const DEFAULT_CAMPAIGN_SCHEDULER_INTERVAL_MS = 60_000;

function getCampaignSchedulerIntervalMs(config: ConfigService): number {
  const raw = config.get<string | number>('CAMPAIGN_SCHEDULER_INTERVAL_MS');
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_CAMPAIGN_SCHEDULER_INTERVAL_MS;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_CAMPAIGN_SCHEDULER_INTERVAL_MS;
  }
  return parsed;
}

/**
 * Polls for due scheduled campaigns and executes them via the shared
 * CampaignService send pipeline. A single in-process in-flight guard prevents
 * overlapping executions; multi-instance safety is enforced by atomic claiming
 * in CampaignService.
 */
@Injectable()
export class CampaignSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly campaignService: CampaignService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const interval = getCampaignSchedulerIntervalMs(this.configService);
    if (interval <= 0) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, interval);
    this.timer.unref();

    // Run once at startup so due campaigns and reconciliation are not delayed
    // by a full polling interval after a restart.
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.inFlight) {
      return this.inFlight;
    }

    const run = this.run().finally(() => {
      this.inFlight = null;
    });
    this.inFlight = run;
    return run;
  }

  private async run(): Promise<void> {
    try {
      await this.campaignService.reconcileSendingCampaigns();
    } catch (error: unknown) {
      this.logger.error(
        `Campaign reconciliation sweep failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      await this.campaignService.processDueScheduledCampaigns();
    } catch (error: unknown) {
      this.logger.error(
        `Scheduled campaign sweep failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
