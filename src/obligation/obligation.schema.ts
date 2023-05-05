import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, Document } from 'mongoose';

export type ObligationDocument = Obligation & Document;

@Schema({ _id: false })
export class Collateral {
  @Prop()
  asset: string;

  @Prop()
  amount: string;

  // @Prop()
  // timestampMs?: string;
}

@Schema({ _id: false })
export class Debt {
  @Prop()
  asset: string;

  @Prop()
  amount: string;

  @Prop()
  borrowIndex: string;

  // @Prop()
  // timestampMs: string;
}

@Schema({ _id: false })
export class Deposit {
  @Prop()
  asset: string;

  @Prop()
  amount: string;

  @Prop()
  timestampMs: string;
}

@Schema({ _id: false })
export class Withdraw {
  @Prop()
  asset: string;

  @Prop()
  amount: string;

  @Prop()
  timestampMs: string;
}

@Schema({ _id: false })
export class Borrow {
  @Prop()
  asset: string;

  @Prop()
  amount: string;

  @Prop()
  timestampMs: string;
}

@Schema({ _id: false })
export class Repay {
  @Prop()
  asset: string;

  @Prop()
  amount: string;

  @Prop()
  timestampMs: string;
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
  timestampMs?: string;

  @Prop({ default: [] })
  collaterals?: Collateral[];

  @Prop({ default: [] })
  debts?: Debt[];

  @Prop({ default: [] })
  deposits?: Deposit[];

  @Prop({ default: [] })
  withdraws?: Withdraw[];

  @Prop({ default: [] })
  borrows?: Borrow[];

  @Prop({ default: [] })
  repays?: Repay[];

  @Prop({ default: now().toString() })
  createdAt?: string;

  @Prop({ default: now().toString() })
  updatedAt?: string;
}

export const ObligationSchema = SchemaFactory.createForClass(Obligation);
ObligationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
