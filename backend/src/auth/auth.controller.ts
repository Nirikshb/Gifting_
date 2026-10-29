import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { SessionGuard } from './guards/session.guard';
import { Customer } from '../customers/entities/customer.entity';
import { SESSION_COOKIE_NAME } from './session.constants';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async signInWithGoogle(
    @Body() googleSignInDto: GoogleSignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { profile, sessionToken } = await this.authService.signInWithGoogle(
      googleSignInDto.credential,
    );

    response.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      this.sessionService.getSessionCookieOptions(),
    );

    return profile;
  }

  @Get('me')
  @UseGuards(SessionGuard)
  getCurrentCustomer(@CurrentCustomer() customer: Customer) {
    return this.authService.toProfile(customer);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const sessionToken = this.sessionService.readSessionTokenFromCookie(
      request.cookies,
    );
    await this.sessionService.invalidateSessionToken(sessionToken);

    response.clearCookie(
      SESSION_COOKIE_NAME,
      this.sessionService.getSessionClearCookieOptions(),
    );

    return { loggedOut: true };
  }
}
