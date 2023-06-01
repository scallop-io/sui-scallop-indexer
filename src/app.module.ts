import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ObligationModule } from './obligation/obligation.module';
import { DepositModule } from './deposit/deposit.module';
import { SuiModule } from './sui/sui.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { BorrowModule } from './borrow/borrow.module';
import { RepayModule } from './repay/repay.module';
import { LiquidateModule } from './liquidate/liquidate.module';
import { BorrowDynamicModule } from './borrow-dynamic/borrow-dynamic.module';
import * as process from 'process';
import * as dotenv from 'dotenv';
import { EventStateModule } from './eventstate/eventstate.module';

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/Scallop',
    ),
    SuiModule,
    EventStateModule,
    ObligationModule,
    DepositModule,
    WithdrawModule,
    BorrowModule,
    RepayModule,
    LiquidateModule,
    BorrowDynamicModule,
  ],
  providers: [AppService],
})
export class AppModule {}
