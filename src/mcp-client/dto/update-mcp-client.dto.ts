import { PartialType } from '@nestjs/mapped-types';
import { CreateMcpClientDto } from './create-mcp-client.dto';

export class UpdateMcpClientDto extends PartialType(CreateMcpClientDto) {}
