import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, Document } from 'mongoose';

export type StatisticDocument = Statistic & Document;

@Schema({ _id: false })
export class Pool {
  @Prop()
  coin?: string;

  @Prop()
  balance?: string;

  @Prop()
  value?: string;
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

  @Prop({ default: new Map() })
  prices: Map<string, number>;

  @Prop({ default: [] })
  collaterals?: Pool[];

  @Prop({ default: [] })
  debts?: Pool[];

  @Prop({ default: [] })
  supplies?: Pool[];

  @Prop()
  totalSupplyValue?: number;

  @Prop()
  totalBorrowValue?: number;

  @Prop()
  totalCollateralValue?: number;

  @Prop()
  totalTVL?: number;

  @Prop({ default: [] })
  leaderboards?: Map<string, any[]>;

  // @Prop({ default: now().toString() })
  // createdAt?: string;

  // @Prop({ default: now().toString() })
  // updatedAt?: string;
}

export const StatisticSchema = SchemaFactory.createForClass(Statistic);
StatisticSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
