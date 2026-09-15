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
  ApiTags,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { BookFiltersDto } from './dto/book-filters.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'List books with optional filters and pagination' })
  @ApiOkResponse({ description: 'Paginated list of books' })
  findAll(@Query() filters: BookFiltersDto) {
    return this.booksService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single book with all relations' })
  @ApiOkResponse({ description: 'Book detail' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Get(':id/cover')
  @ApiOperation({ summary: 'Get cover URL for a book' })
  @ApiOkResponse({ description: 'Cover URL' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  getCover(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.getCover(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new book' })
  @ApiCreatedResponse({ description: 'Book created' })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a book' })
  @ApiOkResponse({ description: 'Book updated' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a book' })
  @ApiNoContentResponse({ description: 'Book deleted' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}
