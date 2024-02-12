import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SnapairdropDocument = Snapairdrop & Document;

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
export class Snapairdrop {
  @Prop({ required: true, index: true, default: '' })
  snapairdropDay?: string;

  @Prop({ required: true, index: true })
  sender?: string;

  @Prop({ index: true, default: 0.0 })
  supplyValue?: number;

  @Prop({ index: true, default: 0 })
  supplyEligible?: number;

  @Prop({ index: true, default: 0.0 })
  borrowValue?: number;

  @Prop({ index: true, default: 0 })
  borrowEligible?: number;

  @Prop({ index: true, default: 0.0 })
  collateralValue?: number;

  @Prop({ index: true, default: 0 })
  collateralEligible?: number;

  @Prop({ index: true, default: 0.0 })
  tvl?: number;

  @Prop({ index: true, default: 0 })
  tvlEligible?: number;
}

export const SnapairdropSchema = SchemaFactory.createForClass(Snapairdrop);
SnapairdropSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
