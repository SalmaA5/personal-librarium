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
import { CollectionTypesService } from './collection-types.service';
import { CreateCollectionTypeDto } from './dto/create-collection-type.dto';

@ApiTags('collection-types')
@Controller('collection-types')
export class CollectionTypesController {
  constructor(private readonly collectionTypesService: CollectionTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all collection types' })
  @ApiOkResponse({ description: 'List of collection types' })
  findAll() {
    return this.collectionTypesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a collection type' })
  @ApiCreatedResponse({ description: 'Collection type created' })
  create(@Body() dto: CreateCollectionTypeDto) {
    return this.collectionTypesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection type name' })
  @ApiOkResponse({ description: 'Collection type updated' })
  @ApiNotFoundResponse({ description: 'Collection type not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCollectionTypeDto) {
    return this.collectionTypesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a collection type (fails if in use)' })
  @ApiNoContentResponse({ description: 'Collection type deleted' })
  @ApiNotFoundResponse({ description: 'Collection type not found' })
  @ApiConflictResponse({ description: 'Collection type is in use' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.collectionTypesService.remove(id);
  }
}
