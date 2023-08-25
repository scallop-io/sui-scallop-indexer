import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, Document } from 'mongoose';

export type RedeemDocument = Redeem & Document;

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
export class Redeem {
  @Prop({ required: true, index: true })
  sender?: string;

  @Prop()
  withdrawAsset?: string;

  @Prop()
  withdrawAmount?: string;

  @Prop()
  burnAsset?: string;

  @Prop()
  burnAmount?: string;

  @Prop()
  redeemer?: string;

  @Prop()
  redeemTime?: string;

  @Prop()
  timestampMs?: string;

  @Prop({ default: now().toString() })
  createdAt?: string;

  @Prop({ default: now().toString() })
  updatedAt?: string;
}

export const RedeemSchema = SchemaFactory.createForClass(Redeem);
RedeemSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
