import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
// import { ObligationService } from './obligation/obligation.service';
import { ObligationModule } from './obligation/obligation.module';
import * as process from 'process';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/Scallop',
    ),
    ObligationModule,
  ],
  // controllers: [AppController],
  // providers: [AppService, ObligationService],
  providers: [AppService],
})
export class AppModule {}
