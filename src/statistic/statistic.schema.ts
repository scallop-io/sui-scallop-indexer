import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, Document } from 'mongoose';

export type StatisticDocument = Statistic & Document;

@Schema({ _id: false })
export class Collateral {
  @Prop()
  coin?: string;

  @Prop()
  price?: number;

  @Prop()
  deposit?: number;

  @Prop()
  weight?: number;
}

@Schema({ _id: false })
export class Asset {
  @Prop()
  coin?: string;

  @Prop()
  price?: number;

  @Prop()
  supply?: number;

  @Prop()
  borrow?: number;

  @Prop()
  liquity?: number;

  @Prop()
  borrowWeight?: number;

  @Prop()
  supplyRate?: number;

  @Prop()
  borrowRate?: number;

  @Prop()
  utilizationRate?: number;

  @Prop()
  weight?: number;
}

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
export class Statistic {
  @Prop({ default: now() })
  timestamp?: Date;

  @Prop({ default: [] })
  collaterals?: Collateral[];

  @Prop({ default: [] })
  assets?: Asset[];

  @Prop({ index: true, sparse: true })
  dataType?: string;

  @Prop()
  totalSupply?: number;

  @Prop()
  totalBorrow?: number;

  @Prop()
  totalTVL?: number;

  @Prop({ default: now().toString() })
  createdAt?: string;

  @Prop({ default: now().toString() })
  updatedAt?: string;
}

export const StatisticSchema = SchemaFactory.createForClass(Statistic);
StatisticSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
