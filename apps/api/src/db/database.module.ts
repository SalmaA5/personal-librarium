import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleClient, createDrizzleClient } from './index';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (config: ConfigService): DrizzleClient =>
        createDrizzleClient(
          config.getOrThrow<string>('TURSO_URL'),
          config.get<string>('TURSO_AUTH_TOKEN'),
        ),
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
