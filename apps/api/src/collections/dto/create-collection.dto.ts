import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['series', 'anthology', 'thematic'] })
  @IsEnum(['series', 'anthology', 'thematic'])
  type!: 'series' | 'anthology' | 'thematic';
}
