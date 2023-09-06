import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MintDocument = Mint & Document;

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
export class Mint {
  @Prop({ required: true, index: true })
  sender?: string;

  @Prop()
  depositAsset?: string;

  @Prop()
  depositAmount?: string;

  @Prop()
  mintAsset?: string;

  @Prop()
  mintAmount?: string;

  @Prop()
  minter?: string;

  @Prop()
  mintTime?: string;

  @Prop()
  timestampMs?: string;

  // @Prop({ default: now().toString() })
  // createdAt?: string;

  // @Prop({ default: now().toString() })
  // updatedAt?: string;
}

export const MintSchema = SchemaFactory.createForClass(Mint);
MintSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
