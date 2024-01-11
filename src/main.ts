import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
  const SNAPSHOT_MODE = Number(process.env.SNAPSHOT_MODE) || 0;

  const app = await NestFactory.createApplicationContext(AppModule);
  const appService = app.get(AppService);
  if (SNAPSHOT_MODE !== 0) {
    appService.loopSnapshotBack();
  } else {
    appService.loopQueryEvents();
  }
}
bootstrap();
