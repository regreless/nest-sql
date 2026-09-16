import { PartialType } from '@nestjs/mapped-types';
import { CreateRagDbDto } from './create-rag-db.dto';

export class UpdateRagDbDto extends PartialType(CreateRagDbDto) {}
