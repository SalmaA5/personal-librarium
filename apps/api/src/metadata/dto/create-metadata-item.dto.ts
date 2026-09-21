import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateMetadataItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}
