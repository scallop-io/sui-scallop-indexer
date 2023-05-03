import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { AppService } from './app.service';
import { ObligationService } from './obligation/obligation.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // application logic...
  const obligationService = app.get(ObligationService);
  // obligationService.listenEvents();
  obligationService.updateObligationsFromQueryEvents();
}
bootstrap();
