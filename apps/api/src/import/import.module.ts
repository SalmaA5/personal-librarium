import { Module } from '@nestjs/common';
import { BooksModule } from '../books/books.module';
import { DriveModule } from '../drive/drive.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [DriveModule, BooksModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
