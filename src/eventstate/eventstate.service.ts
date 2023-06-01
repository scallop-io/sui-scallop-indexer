import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventState, EventStateDocument } from './eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class EventStateService {
  constructor(
    @InjectModel(EventState.name)
    private eventstateModel: Model<EventStateDocument>,
  ) {}

  // findOneByEventStateI
  async findByEventType(
    eventtype: string,
    session: mongoose.ClientSession | null = null,
  ): Promise<EventState> {
    return this.eventstateModel
      .findOne({ eventType: eventtype })
      .session(session)
      .exec();
  }

  // findOneAndUpdateEventState
  async findOneByEventTypeAndUpdateEventState(
    eventtype: string,
    eventstate: EventState,
    session: mongoose.ClientSession | null = null,
  ): Promise<EventState> {
    return this.eventstateModel
      .findOneAndUpdate({ eventType: eventtype }, eventstate, { upsert: true })
      .session(session)
      .exec();
  }
}
