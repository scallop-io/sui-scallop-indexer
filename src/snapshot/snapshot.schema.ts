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
  @Prop({ required: true, index: true, unique: true })
  sender?: string;

  @Prop()
  supplyValue?: number;

  @Prop()
  borrowValue?: number;

  @Prop()
  collateralValue?: number;

  @Prop({ index: true })
  tvl?: number;
}

export const SnapshotSchema = SchemaFactory.createForClass(Snapshot);
SnapshotSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
