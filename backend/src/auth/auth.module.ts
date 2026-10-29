import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';
import { SessionService } from './session.service';

@Module({
  imports: [CustomersModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionGuard],
  exports: [SessionGuard, SessionService],
})
export class AuthModule {}
