import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, Document } from 'mongoose';

export type ObligationDocument = Obligation & Document;

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
export class Obligation {
  @Prop({ required: true, index: true, unique: true })
  obligation_id: string;

  @Prop()
  obligation_key: string;

  @Prop()
  sender?: string;

  @Prop()
  timestampMs?: string;

  @Prop({ default: now().toString() })
  createdAt?: string;

  @Prop({ default: now().toString() })
  updatedAt?: string;
}

export const ObligationSchema = SchemaFactory.createForClass(Obligation);
ObligationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
