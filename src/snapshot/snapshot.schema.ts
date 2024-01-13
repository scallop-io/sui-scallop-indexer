import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SnapshotDocument = Snapshot & Document;

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
export class Snapshot {
  @Prop({ required: true, index: true, default: '' })
  snapshotDay?: string;

  @Prop({ required: true, index: true })
  sender?: string;

  @Prop({ index: true, default: 0.0 })
  supplyValue?: number;

  @Prop({ index: true, default: 0.0 })
  borrowValue?: number;

  @Prop({ index: true, default: 0.0 })
  collateralValue?: number;

  @Prop({ index: true, default: 0.0 })
  tvl?: number;
}

export const SnapshotSchema = SchemaFactory.createForClass(Snapshot);
SnapshotSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
