import { Module } from '@nestjs/common';
import { CollectionTypesController } from './collection-types.controller';
import { CollectionTypesService } from './collection-types.service';

@Module({
  controllers: [CollectionTypesController],
  providers: [CollectionTypesService],
})
export class CollectionTypesModule {}
