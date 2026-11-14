import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CampaignService } from './campaign.service';
import { AudienceService } from './audience.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListCampaignsQueryDto } from './dto/list-campaigns-query.dto';
import { ScheduleCampaignDto } from './dto/schedule-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { AudiencePreviewQueryDto } from './dto/audience-definition.dto';

/**
 * Campaign management API.
 *
 * All endpoints require an administrator session; mutations additionally
 * require the CSRF token and the configured origin.
 */
@Controller('admin/campaigns')
@UseGuards(AdminGuard)
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly audienceService: AudienceService,
  ) {}

  @Get()
  list(@Query() query: ListCampaignsQueryDto) {
    return this.campaignService.list({
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    const campaign = await this.campaignService.findOne(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found.`);
    }
    return campaign;
  }

  @Post()
  @UseGuards(CsrfGuard)
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create({
      name: dto.name,
      subject: dto.subject,
      heading: dto.heading,
      content: dto.content,
      imageUrl: dto.imageUrl ?? null,
      ctaLabel: dto.ctaLabel ?? null,
      ctaUrl: dto.ctaUrl ?? null,
      audienceDefinition: dto.audienceDefinition ?? null,
    });
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    return this.campaignService.update(campaignId, {
      name: dto.name,
      subject: dto.subject,
      heading: dto.heading,
      content: dto.content,
      imageUrl: dto.imageUrl,
      ctaLabel: dto.ctaLabel,
      ctaUrl: dto.ctaUrl,
      audienceDefinition: dto.audienceDefinition,
    });
  }

  @Post(':id/schedule')
  @UseGuards(CsrfGuard)
  async schedule(@Param('id') id: string, @Body() dto: ScheduleCampaignDto) {
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    return this.campaignService.schedule(campaignId, {
      scheduledAt: dto.scheduledAt,
    });
  }

  @Post(':id/send')
  @UseGuards(AdminGuard, CsrfGuard)
  async send(@Param('id') id: string) {
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    return this.campaignService.send(campaignId);
  }

  @Post(':id/cancel')
  @UseGuards(CsrfGuard)
  async cancel(@Param('id') id: string) {
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    return this.campaignService.cancel(campaignId);
  }

  @Post('audience-preview')
  @UseGuards(AdminGuard, CsrfGuard)
  async audiencePreview(@Body() dto: AudiencePreviewQueryDto) {
    // Compute eligible recipient count and sample emails
    const { count, sampleEmails } = await this.audienceService.countEligible(
      dto.audienceDefinition,
    );

    // Return the validated definition, count, and sample
    return {
      recipientCount: count,
      sampleEmails,
      audienceDefinition: dto.audienceDefinition,
    };
  }
}
