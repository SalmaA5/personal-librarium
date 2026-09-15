import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driveFileId?: string;

  @ApiPropertyOptional({ enum: ['epub', 'pdf', 'html', 'cbz'] })
  @IsOptional()
  @IsEnum(['epub', 'pdf', 'html', 'cbz'])
  format?: 'epub' | 'pdf' | 'html' | 'cbz';

  @ApiPropertyOptional({ enum: ['drive_only', 'cached', 'downloaded'] })
  @IsOptional()
  @IsEnum(['drive_only', 'cached', 'downloaded'])
  fileStatus?: 'drive_only' | 'cached' | 'downloaded';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cachedPath?: string;

  @ApiPropertyOptional({ enum: ['unread', 'reading', 'read'] })
  @IsOptional()
  @IsEnum(['unread', 'reading', 'read'])
  status?: 'unread' | 'reading' | 'read';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalChapters?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalVolumes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  review?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalFormat?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
