import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ImportService } from './import.service';

class ImportFromDriveDto {
  @IsString()
  driveFileId!: string;
}

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('drive')
  @ApiOperation({ summary: 'Import a book from Google Drive by file ID' })
  @ApiCreatedResponse({ description: 'Book imported and saved to the library' })
  importFromDrive(@Body() dto: ImportFromDriveDto) {
    return this.importService.importFromDrive(dto.driveFileId);
  }
}
