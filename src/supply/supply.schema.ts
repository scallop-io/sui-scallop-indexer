import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, Document } from 'mongoose';

export type SupplyDocument = Supply & Document;

@Schema({ _id: false })
export class Asset {
  @Prop()
  coin?: string;

  @Prop()
  balance?: string;
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
export class Supply {
  @Prop({ required: true, index: true, unique: true })
  sender?: string;

  @Prop({ default: [] })
  assets?: Asset[];

  @Prop({ default: now().toString() })
  createdAt?: string;

  @Prop({ default: now().toString() })
  updatedAt?: string;
}

export const SupplySchema = SchemaFactory.createForClass(Supply);
SupplySchema.virtual('id').get(function () {
  return this._id.toHexString();
});
