import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Obligation, ObligationSchema } from './obligation.schema';
import { ObligationService } from './obligation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Obligation.name, schema: ObligationSchema },
    ]),
  ],
  providers: [ObligationService],
})
export class ObligationModule {}
