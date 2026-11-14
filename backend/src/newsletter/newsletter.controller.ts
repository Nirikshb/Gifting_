import { Body, Controller, Post } from '@nestjs/common';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { ConfirmNewsletterDto } from './dto/confirm-newsletter.dto';
import { UnsubscribeNewsletterDto } from './dto/unsubscribe-newsletter.dto';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post()
  create(@Body() createNewsletterDto: CreateNewsletterDto) {
    return this.newsletterService.create(createNewsletterDto);
  }

  @Post('confirm')
  confirm(@Body() confirmNewsletterDto: ConfirmNewsletterDto) {
    return this.newsletterService.confirm(confirmNewsletterDto);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() unsubscribeNewsletterDto: UnsubscribeNewsletterDto) {
    return this.newsletterService.unsubscribe(unsubscribeNewsletterDto);
  }
}
