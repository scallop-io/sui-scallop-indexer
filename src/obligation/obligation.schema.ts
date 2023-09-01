import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ObligationDocument = Obligation & Document;

@Schema({ _id: false })
export class Collateral {
  @Prop()
  asset?: string;

  @Prop()
  amount?: string;
}

@Schema({ _id: false })
export class Debt {
  @Prop()
  asset?: string;

  @Prop()
  amount?: string;

  @Prop()
  borrowIndex: string;
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
export class Obligation {
  @Prop({ required: true, index: true, unique: true })
  obligation_id: string;

  @Prop()
  obligation_key: string;

  @Prop()
  sender?: string;

  @Prop()
  version?: string;

  @Prop()
  timestampMs?: string;

  @Prop({ default: [] })
  collaterals?: Collateral[];

  @Prop({ default: [] })
  debts?: Debt[];

  @Prop()
  collaterals_parent_id?: string;

  @Prop()
  debts_parent_id?: string;

  // @Prop({ default: now().toString() })
  // createdAt?: string;

  // @Prop({ default: now().toString() })
  // updatedAt?: string;
}

export const ObligationSchema = SchemaFactory.createForClass(Obligation);
ObligationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
