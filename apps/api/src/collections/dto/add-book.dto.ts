import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class AddBookDto {
  @ApiProperty()
  @IsNumber()
  bookId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}
