import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BooksModule } from '../books/books.module';
import { CollectionsModule } from '../collections/collections.module';
import { ReaderModule } from '../reader/reader.module';
import { ProgressModule } from '../progress/progress.module';
import { DriveModule } from '../drive/drive.module';
import { ImportModule } from '../import/import.module';
import { MetadataModule } from '../metadata/metadata.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BooksModule,
    CollectionsModule,
    ReaderModule,
    ProgressModule,
    DriveModule,
    ImportModule,
    MetadataModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
