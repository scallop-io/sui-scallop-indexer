import { Module } from '@nestjs/common';
import { RepayService } from './repay.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Repay, RepaySchema } from './repay.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Repay.name, schema: RepaySchema }]),
  ],
  providers: [RepayService],
  exports: [RepayService],
})
export class RepayModule {}
