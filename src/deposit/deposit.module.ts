import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Deposit, DepositSchema } from './deposit.schema';
import { DepositService } from './deposit.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Deposit.name, schema: DepositSchema }]),
  ],
  providers: [DepositService],
  exports: [DepositService],
})
export class DepositModule {}
