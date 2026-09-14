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
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { AddBookDto } from './dto/add-book.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { ReorderBooksDto } from './dto/reorder-books.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@ApiTags('collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all collections' })
  @ApiQuery({ name: 'type', required: false, enum: ['series', 'anthology', 'thematic'] })
  @ApiOkResponse({ description: 'List of collections with book count and cover thumbnails' })
  findAll(@Query('type') type?: string) {
    return this.collectionsService.findAll(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get collection detail with ordered books' })
  @ApiOkResponse({ description: 'Collection detail' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.collectionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiCreatedResponse({ description: 'Collection created' })
  create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection' })
  @ApiOkResponse({ description: 'Collection updated' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a collection (books are not deleted)' })
  @ApiNoContentResponse({ description: 'Collection deleted' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.collectionsService.remove(id);
  }

  @Post(':id/books')
  @ApiOperation({ summary: 'Add a book to a collection (upserts order if already linked)' })
  @ApiOkResponse({ description: 'Book added or order updated' })
  @ApiNotFoundResponse({ description: 'Collection or book not found' })
  addBook(@Param('id', ParseIntPipe) id: number, @Body() dto: AddBookDto) {
    return this.collectionsService.addBook(id, dto);
  }

  @Delete(':id/books/:bookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a book from a collection' })
  @ApiNoContentResponse({ description: 'Book removed from collection' })
  @ApiNotFoundResponse({ description: 'Link not found' })
  removeBook(
    @Param('id', ParseIntPipe) id: number,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.collectionsService.removeBook(id, bookId);
  }

  @Patch(':id/books/reorder')
  @ApiOperation({ summary: 'Reorder books within a collection' })
  @ApiOkResponse({ description: 'Order updated' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  reorderBooks(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderBooksDto,
  ) {
    return this.collectionsService.reorderBooks(id, dto);
  }
}
