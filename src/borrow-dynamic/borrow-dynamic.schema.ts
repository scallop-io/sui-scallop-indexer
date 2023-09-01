import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BorrowDynamicDocument = BorrowDynamic & Document;

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
export class BorrowDynamic {
  @Prop({ required: true, index: true, unique: true })
  coinType: string;

  @Prop({ default: '' })
  borrowIndex: string;

  @Prop({ default: '' })
  interestRate: string;

  @Prop({ default: '' })
  interestRateScale: string;

  @Prop({ default: '' })
  lastUpdated: string;

  // @Prop({ default: now().toString() })
  // createdAt?: string;

  // @Prop({ default: now().toString() })
  // updatedAt?: string;
}

export const BorrowDynamicSchema = SchemaFactory.createForClass(BorrowDynamic);
BorrowDynamicSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
