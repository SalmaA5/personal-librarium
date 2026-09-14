import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReaderService } from './reader.service';

@ApiTags('reader')
@Controller('books/:bookId')
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  @Get('read')
  @ApiOperation({ summary: 'Get read content — returns HTML string or stream descriptor' })
  @ApiOkResponse({ description: '{ type: "html", content } or { type: "stream", driveFileId }' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  getReadContent(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.readerService.getReadContent(bookId);
  }

  @Get('read/stream')
  @ApiOperation({ summary: 'Stream book file directly from Google Drive' })
  @ApiNotFoundResponse({ description: 'Book not found or no Drive file attached' })
  streamBook(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Res() res: Response,
  ) {
    return this.readerService.streamBook(bookId, res);
  }
}
