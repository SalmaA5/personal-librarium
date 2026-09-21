import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMetadataItemDto } from './dto/create-metadata-item.dto';
import { MetadataService } from './metadata.service';

@ApiTags('metadata')
@Controller()
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  // ── Genres ─────────────────────────────────────────────────────────────────
  @Get('genres')
  @ApiOperation({ summary: 'List all genres with book count' })
  @ApiOkResponse({ description: 'List of genres' })
  getGenres() {
    return this.metadataService.getGenres();
  }

  @Post('genres')
  @ApiOperation({ summary: 'Create a genre' })
  @ApiCreatedResponse({ description: 'Genre created' })
  createGenre(@Body() dto: CreateMetadataItemDto) {
    return this.metadataService.createGenre(dto.name);
  }

  @Patch('genres/:id')
  @ApiOperation({ summary: 'Update a genre name' })
  @ApiOkResponse({ description: 'Genre updated' })
  @ApiNotFoundResponse({ description: 'Genre not found' })
  updateGenre(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateMetadataItemDto) {
    return this.metadataService.updateGenre(id, dto.name);
  }

  @Delete('genres/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a genre (fails if in use)' })
  @ApiNoContentResponse({ description: 'Genre deleted' })
  @ApiNotFoundResponse({ description: 'Genre not found' })
  @ApiConflictResponse({ description: 'Genre has associated books' })
  deleteGenre(@Param('id', ParseIntPipe) id: number) {
    return this.metadataService.deleteGenre(id);
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  @Get('tags')
  @ApiOperation({ summary: 'List all tags with book count' })
  @ApiOkResponse({ description: 'List of tags' })
  getTags() {
    return this.metadataService.getTags();
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a tag' })
  @ApiCreatedResponse({ description: 'Tag created' })
  createTag(@Body() dto: CreateMetadataItemDto) {
    return this.metadataService.createTag(dto.name);
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Update a tag name' })
  @ApiOkResponse({ description: 'Tag updated' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  updateTag(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateMetadataItemDto) {
    return this.metadataService.updateTag(id, dto.name);
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag (fails if in use)' })
  @ApiNoContentResponse({ description: 'Tag deleted' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiConflictResponse({ description: 'Tag has associated books' })
  deleteTag(@Param('id', ParseIntPipe) id: number) {
    return this.metadataService.deleteTag(id);
  }

  // ── Authors ────────────────────────────────────────────────────────────────
  @Get('authors')
  @ApiOperation({ summary: 'List all authors with book count' })
  @ApiOkResponse({ description: 'List of authors' })
  getAuthors() {
    return this.metadataService.getAuthors();
  }

  @Post('authors')
  @ApiOperation({ summary: 'Create an author' })
  @ApiCreatedResponse({ description: 'Author created' })
  createAuthor(@Body() dto: CreateMetadataItemDto) {
    return this.metadataService.createAuthor(dto.name);
  }

  @Patch('authors/:id')
  @ApiOperation({ summary: 'Update an author name' })
  @ApiOkResponse({ description: 'Author updated' })
  @ApiNotFoundResponse({ description: 'Author not found' })
  updateAuthor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMetadataItemDto
  ) {
    return this.metadataService.updateAuthor(id, dto.name);
  }

  @Delete('authors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an author (fails if in use)' })
  @ApiNoContentResponse({ description: 'Author deleted' })
  @ApiNotFoundResponse({ description: 'Author not found' })
  @ApiConflictResponse({ description: 'Author has associated books' })
  deleteAuthor(@Param('id', ParseIntPipe) id: number) {
    return this.metadataService.deleteAuthor(id);
  }
}
