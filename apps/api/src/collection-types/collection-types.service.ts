import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { DrizzleClient } from '../db/index';
import { collection, collectionType } from '../db/schema';
import { CreateCollectionTypeDto } from './dto/create-collection-type.dto';

@Injectable()
export class CollectionTypesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  findAll() {
    return this.db
      .select()
      .from(collectionType)
      .orderBy(asc(collectionType.name));
  }

  async create(dto: CreateCollectionTypeDto) {
    const [created] = await this.db
      .insert(collectionType)
      .values({ name: dto.name })
      .returning();
    return created;
  }

  async update(id: number, dto: CreateCollectionTypeDto) {
    const [existing] = await this.db
      .select({ id: collectionType.id })
      .from(collectionType)
      .where(eq(collectionType.id, id))
      .limit(1);

    if (!existing)
      throw new NotFoundException(`Collection type ${id} not found`);

    const [updated] = await this.db
      .update(collectionType)
      .set({ name: dto.name })
      .where(eq(collectionType.id, id))
      .returning();

    return updated;
  }

  async remove(id: number) {
    const [existing] = await this.db
      .select({ id: collectionType.id })
      .from(collectionType)
      .where(eq(collectionType.id, id))
      .limit(1);

    if (!existing)
      throw new NotFoundException(`Collection type ${id} not found`);

    const [inUse] = await this.db
      .select({ id: collection.id })
      .from(collection)
      .where(eq(collection.typeId, id))
      .limit(1);

    if (inUse)
      throw new ConflictException(
        `Collection type ${id} is in use and cannot be deleted`,
      );

    await this.db.delete(collectionType).where(eq(collectionType.id, id));
  }
}
