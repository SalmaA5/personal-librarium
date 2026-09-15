import { Controller, Get, Query, Redirect, Res } from '@nestjs/common';
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
  async handleCallback(
    @Query('code') code: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }

    try {
      await this.authService.handleCallback(code);
      res.send(`
        <html><body style="font-family:sans-serif;padding:2rem">
          <h2>✅ Authorization successful</h2>
          <p>Google Drive credentials are saved. You can close this tab.</p>
        </body></html>
      `);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).send(`Authorization failed: ${message}`);
    }
  }

  @Get('status')
  getStatus() {
    return { authorized: this.authService.isAuthorized() };
  }
}
