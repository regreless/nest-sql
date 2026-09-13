import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  ParseIntPipe,
} from '@nestjs/common';

@Injectable()
export class ParseIdPipe extends ParseIntPipe {
  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    const id = await super.transform(value, metadata);
    if (id < 1 || id > 2147483647) {
      throw new BadRequestException('ID 必须是 1 到 2147483647 之间的整数');
    }
    return id;
  }
}
