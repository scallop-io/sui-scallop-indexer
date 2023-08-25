import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Redeem, RedeemSchema } from './redeem.schema';
import { RedeemService } from './redeem.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Redeem.name, schema: RedeemSchema }]),
  ],
  providers: [RedeemService],
  exports: [RedeemService],
})
export class RedeemModule {}
