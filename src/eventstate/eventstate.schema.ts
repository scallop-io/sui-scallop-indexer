import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, Document } from 'mongoose';

export type EventStateDocument = EventState & Document;

@Schema({
  versionKey: 'version',
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id;
    },
  },
  toObject: { virtuals: true },
  timestamps: true,
})
export class EventState {
  @Prop({ required: true, index: true, unique: true })
  eventType: string;

  @Prop({ default: '' })
  nextCursorTxDigest: string;

  @Prop({ default: '' })
  nextCursorEventSeq: string;

  @Prop({ default: now().toString() })
  createdAt?: string;

  @Prop({ default: now().toString() })
  updatedAt?: string;
}

export const EventStateSchema = SchemaFactory.createForClass(EventState);
EventStateSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
