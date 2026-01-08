import { Module } from '@nestjs/common';
import { MouseService } from './mouse.service';
import { MouseGateway } from './mouse.gateway';
import { MouseController } from './mouse.controller';

@Module({
  providers: [MouseService, MouseGateway],
  controllers: [MouseController]
})
export class MouseModule {}
