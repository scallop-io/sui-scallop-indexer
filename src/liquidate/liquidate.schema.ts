import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Obligation } from 'src/obligation/obligation.schema';

export type LiquidateDocument = Liquidate & Document;

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
export class Liquidate {
  @Prop()
  debtType?: string;

  @Prop()
  collateralType?: string;

  @Prop()
  repayOnBehalf?: string;

  @Prop()
  repayRevenue?: string;

  @Prop()
  liqAmount?: string;

  @Prop()
  liquidator?: string;

  @Prop({ index: true, sparse: true })
  obligation_id: string;

  @Prop({ type: Types.ObjectId, ref: 'Obligation' })
  obligation?: Obligation;

  @Prop()
  timestampMs?: string;

  @Prop()
  timestampMsIsoDate?: string;

  @Prop()
  txDigest?: string;

  @Prop()
  eventSeq?: string;

  // @Prop({ default: now().toString() })
  // createdAt?: string;

  // @Prop({ default: now().toString() })
  // updatedAt?: string;
}

export const LiquidateSchema = SchemaFactory.createForClass(Liquidate);
LiquidateSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
