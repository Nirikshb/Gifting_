import { Module, forwardRef } from '@nestjs/common';
import { CartsModule } from '../carts/carts.module';
import { CustomersModule } from '../customers/customers.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { AdminGuard } from './guards/admin.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { SessionGuard } from './guards/session.guard';
import { SessionService } from './session.service';

@Module({
  imports: [CustomersModule, forwardRef(() => CartsModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionGuard,
    AdminGuard,
    CsrfService,
    CsrfGuard,
  ],
  exports: [SessionGuard, AdminGuard, SessionService, CsrfGuard],
})
export class AuthModule {}
