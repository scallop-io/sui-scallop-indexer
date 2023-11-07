import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Obligation } from 'src/obligation/obligation.schema';

export type DepositDocument = Deposit & Document;

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
export class Deposit {
  @Prop()
  asset?: string;

  @Prop()
  amount?: string;

  @Prop()
  timestampMs?: string;

  @Prop({ index: true, sparse: true })
  obligation_id: string;

  @Prop({ type: Types.ObjectId, ref: 'Obligation' })
  obligation?: Obligation;

  // @Prop({ default: now().toString() })
  // createdAt?: string;

  // @Prop({ default: now().toString() })
  // updatedAt?: string;
}

export const DepositSchema = SchemaFactory.createForClass(Deposit);
DepositSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
