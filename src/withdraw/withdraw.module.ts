import { Module } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Withdraw, WithdrawSchema } from './withdraw.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Withdraw.name, schema: WithdrawSchema },
    ]),
  ],
  providers: [WithdrawService],
  exports: [WithdrawService],
})
export class WithdrawModule {}
