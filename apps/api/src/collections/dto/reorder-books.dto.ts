import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';

class BookOrderItem {
  @IsNumber()
  bookId!: number;

  @IsNumber()
  order!: number;
}

export class ReorderBooksDto {
  @ApiProperty({ type: [BookOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookOrderItem)
  books!: BookOrderItem[];
}
