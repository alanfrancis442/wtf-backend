import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MouseModule } from './mouse/mouse.module';

@Module({
  imports: [MouseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
