import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FlashloanDocument = Flashloan & Document;

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
export class Flashloan {
  @Prop()
  type?: string;

  @Prop()
  borrower?: string;

  @Prop()
  asset?: string;

  @Prop()
  amount?: string;

  @Prop()
  timestampMs?: string;

  // @Prop({ default: now().toString() })
  // createdAt?: string;

  // @Prop({ default: now().toString() })
  // updatedAt?: string;
}

export const FlashloanSchema = SchemaFactory.createForClass(Flashloan);
FlashloanSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
