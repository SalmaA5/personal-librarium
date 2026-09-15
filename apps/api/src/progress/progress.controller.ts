import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@Controller('books/:bookId/progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Get reading progress for a book' })
  @ApiOkResponse({
    description: 'Progress record (percentage: 0 if none exists)',
  })
  findOne(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.progressService.findOne(bookId);
  }

  @Patch()
  @ApiOperation({ summary: 'Upsert reading progress for a book' })
  @ApiOkResponse({ description: 'Progress created or updated' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  upsert(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.progressService.upsert(bookId, dto);
  }
}
