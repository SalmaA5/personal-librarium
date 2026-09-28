import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Redirect,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@ApiExcludeController()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @Redirect()
  startAuth() {
    return { url: this.authService.getAuthUrl() };
  }

  @Get('google/callback')
  async handleCallback(@Query('code') code: string, @Res() res: Response): Promise<void> {
    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }

    const webBase = this.authService.getWebBaseUrl();
    try {
      await this.authService.handleCallback(code);
      res.redirect(`${webBase}/import?auth=success`);
    } catch (err) {
      const message = encodeURIComponent(
        err instanceof Error ? err.message : String(err)
      );
      res.redirect(`${webBase}/import?auth=error&message=${message}`);
    }
  }

  @Get('status')
  getStatus() {
    return { authorized: this.authService.isAuthorized() };
  }

  @Delete('google')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCredentials(): Promise<void> {
    await this.authService.clearCredentials();
  }
}
