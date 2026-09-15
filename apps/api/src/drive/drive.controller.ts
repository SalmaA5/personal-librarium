import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DriveService } from './drive.service';

@ApiTags('drive')
@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('folders')
  @ApiOperation({
    summary: 'List folders in My Drive or inside a parent folder',
  })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiOkResponse({ description: 'Folder list' })
  listFolders(@Query('parentId') parentId?: string) {
    return this.driveService.listFolders(parentId);
  }

  @Get('folders/:folderId')
  @ApiOperation({ summary: 'List book files inside a folder' })
  @ApiOkResponse({ description: 'File list' })
  listFiles(@Param('folderId') folderId: string) {
    return this.driveService.listFiles(folderId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search book files by name across all of Drive' })
  @ApiQuery({ name: 'q', required: true })
  @ApiOkResponse({ description: 'Matching files' })
  searchFiles(@Query('q') q: string) {
    return this.driveService.searchFiles(q);
  }
}
