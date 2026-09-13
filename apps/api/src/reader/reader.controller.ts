import { Controller } from '@nestjs/common';
import { ReaderService } from './reader.service';

@Controller('reader')
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}
}
