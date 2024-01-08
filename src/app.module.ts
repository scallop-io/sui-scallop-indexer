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
import { FlashloanModule } from './flashloan/flashloan.module';
import { StatisticModule } from './statistic/statistic.module';
import { MintModule } from './mint/mint.module';
import { RedeemModule } from './redeem/redeem.module';
import { SupplyModule } from './supply/supply.module';
import { SnapshotModule } from './snapshot/snapshot.module';
import { SnapbatchModule } from './snapbatch/snapbatch.module';
import { SnappriceModule } from './snapprice/snapprice.module';

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/Scallop',
      {
        // if the replica is only 1, set directConnection to `true`
        directConnection: false,
      },
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
    FlashloanModule,
    StatisticModule,
    MintModule,
    RedeemModule,
    SupplyModule,
    SnapshotModule,
    SnapbatchModule,
    SnappriceModule,
  ],
  providers: [AppService],
})
export class AppModule {}
