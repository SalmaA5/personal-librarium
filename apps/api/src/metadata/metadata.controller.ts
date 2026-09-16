import { Controller, Get } from '@nestjs/common';
import { MetadataService } from './metadata.service';

@Controller()
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('genres')
  getGenres() {
    return this.metadataService.getGenres();
  }

  @Get('tags')
  getTags() {
    return this.metadataService.getTags();
  }

  @Get('authors')
  getAuthors() {
    return this.metadataService.getAuthors();
  }
}
