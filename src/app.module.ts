import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { config } from '@/app.config';
import { AppService } from '@/app.service';
import { GlobalModule } from '@/modules/global';
import { ObligationModule } from './obligation/obligation.module';
import { DepositModule } from './deposit/deposit.module';
import { SuiModule } from './sui/sui.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { BorrowModule } from './borrow/borrow.module';
import { RepayModule } from './repay/repay.module';
import { LiquidateModule } from './liquidate/liquidate.module';
import { BorrowDynamicModule } from './borrow-dynamic/borrow-dynamic.module';
import { EventStateModule } from './eventstate/eventstate.module';
import { FlashloanModule } from './flashloan/flashloan.module';
import { StatisticModule } from './statistic/statistic.module';
import { MintModule } from './mint/mint.module';
import { RedeemModule } from './redeem/redeem.module';
import { SupplyModule } from './supply/supply.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    MongooseModule.forRoot(config().database.uri, {
      // if the replica is only 1, set directConnection to `true`
      directConnection: false,
    }),
    GlobalModule,
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
  ],
  providers: [AppService],
})
export class AppModule {}
