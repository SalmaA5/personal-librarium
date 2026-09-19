import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
type Credentials = Parameters<OAuth2Client['setCredentials']>[0];
import type { DrizzleClient } from '../db/index';
import { DRIZZLE } from '../db/database.module';
import { appConfig } from '../db/schema';

const TOKENS_KEY = 'google_tokens';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  readonly oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
    private readonly config: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      `${config.get<string>('API_BASE_URL', 'http://localhost:3000')}/api/auth/google/callback`,
    );

    // Persist any rotated tokens automatically
    this.oauth2Client.on('tokens', async (tokens: Credentials) => {
      await this.saveTokens(tokens);
    });
  }

  async onModuleInit() {
    try {
      const stored = await this.loadTokens();
      if (stored) {
        this.oauth2Client.setCredentials(stored);
        this.logger.log('Google credentials loaded from database');
        return;
      }
    } catch (err) {
      this.logger.warn(`Could not load Google tokens from DB: ${err}`);
    }

    const envRefreshToken = this.config.get<string>('GOOGLE_REFRESH_TOKEN');
    if (envRefreshToken) {
      this.oauth2Client.setCredentials({ refresh_token: envRefreshToken });
      this.logger.log('Google credentials loaded from env');
    } else {
      this.logger.warn(
        'No Google credentials found — visit /api/auth/google to authorize',
      );
    }
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPE,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    await this.saveTokens(tokens as Credentials);
    this.logger.log('Google credentials obtained and saved');
  }

  isAuthorized(): boolean {
    const creds = this.oauth2Client.credentials;
    return !!(creds.refresh_token || creds.access_token);
  }

  async clearCredentials(): Promise<void> {
    this.oauth2Client.setCredentials({});
    await this.db.delete(appConfig).where(eq(appConfig.key, TOKENS_KEY));
    this.logger.warn('Google credentials cleared — re-authorization required');
  }

  private async loadTokens(): Promise<Credentials | null> {
    const rows = await this.db
      .select()
      .from(appConfig)
      .where(eq(appConfig.key, TOKENS_KEY));

    if (!rows[0]) return null;
    try {
      return JSON.parse(rows[0].value) as Credentials;
    } catch {
      return null;
    }
  }

  private async saveTokens(tokens: Credentials): Promise<void> {
    const existing = await this.db
      .select()
      .from(appConfig)
      .where(eq(appConfig.key, TOKENS_KEY));

    const merged: Credentials = { ...this.oauth2Client.credentials, ...tokens };
    const value = JSON.stringify(merged);

    if (existing.length > 0) {
      await this.db
        .update(appConfig)
        .set({ value, updatedAt: new Date().toISOString() })
        .where(eq(appConfig.key, TOKENS_KEY));
    } else {
      await this.db.insert(appConfig).values({
        key: TOKENS_KEY,
        value,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
