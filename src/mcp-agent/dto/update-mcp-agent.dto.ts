import { PartialType } from '@nestjs/mapped-types';
import { CreateMcpAgentDto } from './create-mcp-agent.dto';

export class UpdateMcpAgentDto extends PartialType(CreateMcpAgentDto) {}
