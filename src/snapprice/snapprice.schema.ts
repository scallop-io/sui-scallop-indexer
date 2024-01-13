import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SnappriceDocument = Snapprice & Document;

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
export class Snapprice {
  @Prop({ required: true, index: true, default: '' })
  snapshotDay?: string;

  @Prop({ required: true, index: true })
  coinType?: string;

  @Prop({ required: true, index: true })
  coinSymbol?: string;

  @Prop({ index: true, default: 0.0 })
  coinPrice?: number;

  @Prop({ index: true, default: 0 })
  coinDecimal?: number;
}

export const SnappriceSchema = SchemaFactory.createForClass(Snapprice);
SnappriceSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
