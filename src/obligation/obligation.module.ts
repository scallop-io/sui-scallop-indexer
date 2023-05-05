import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Obligation, ObligationSchema } from './obligation.schema';
import { ObligationService } from './obligation.service';
import { EventStateModule } from 'src/eventstate/eventstate.module';
import { EventStateService } from 'src/eventstate/eventstate.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Obligation.name, schema: ObligationSchema },
    ]),
    EventStateModule,
  ],
  providers: [ObligationService],
})
export class ObligationModule {}
