import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventState, EventStateDocument } from './eventstate.schema';

@Injectable()
export class EventStateService {
  constructor(
    @InjectModel(EventState.name)
    private eventstateModel: Model<EventStateDocument>,
  ) {}

  async create(eventstate: EventState): Promise<EventState> {
    const createdEventState = new this.eventstateModel(eventstate);
    return createdEventState.save();
  }

  async findAll(): Promise<EventState[]> {
    return this.eventstateModel.find().exec();
  }

  async findOne(id: string): Promise<EventState> {
    return this.eventstateModel.findById(id).exec();
  }

  async update(id: string, eventstate: EventState): Promise<EventState> {
    return this.eventstateModel
      .findByIdAndUpdate(id, eventstate, {
        new: true,
      })
      .exec();
  }

  // findOneByEventStateI
  async findByEventType(eventtype: string): Promise<EventState> {
    return this.eventstateModel.findOne({ eventType: eventtype }).exec();
  }

  // findOneAndUpdateEventState
  async findOneByEventTypeAndUpdateEventState(
    eventtype: string,
    eventstate: EventState,
  ): Promise<EventState> {
    return this.eventstateModel
      .findOneAndUpdate({ eventType: eventtype }, eventstate, { upsert: true })
      .exec();
  }
}
