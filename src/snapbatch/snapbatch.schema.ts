import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SnapbatchDocument = Snapbatch & Document;

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
export class Snapbatch {
  @Prop({ index: true, default: 0 })
  batch?: number;

  @Prop({ index: true, default: 0 })
  shapbatchedAt?: Date;

  @Prop({ index: true, default: 0 })
  shapbatchPoint?: number;

  @Prop({ required: true, index: true })
  sender?: string;

  @Prop({ index: true, default: 0 })
  supplyValue?: number;

  @Prop({ index: true, default: 0 })
  borrowValue?: number;

  @Prop()
  collateralValue?: number;

  @Prop({ index: true, default: 0 })
  tvl?: number;

  @Prop({ index: true, default: 0 })
  supplyTier?: number;

  @Prop({ index: true, default: 0 })
  borrowTier?: number;

  @Prop({ index: true, default: 0 })
  tvlTier?: number;
}

export const SnapbatchSchema = SchemaFactory.createForClass(Snapbatch);
SnapbatchSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
