import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Newsletter } from './entities/newsletter.entity';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Newsletter]), NotificationsModule],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
