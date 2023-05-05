import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventState, EventStateSchema } from './eventstate.schema';
import { EventStateService } from './eventstate.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventState.name, schema: EventStateSchema },
    ]),
  ],
  providers: [EventStateService],
  exports: [EventStateService],
})
export class EventStateModule {}
