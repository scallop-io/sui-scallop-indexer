import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Statistic, StatisticSchema } from './statistic.schema';
import { StatisticService } from './statistic.service';
import { SuiModule } from 'src/sui/sui.module';
import { ObligationModule } from 'src/obligation/obligation.module';
import { SupplyModule } from 'src/supply/supply.module';
import { MintModule } from 'src/mint/mint.module';
import { RedeemModule } from 'src/redeem/redeem.module';
import { SnapshotModule } from '../snapshot/snapshot.module';
import { SnapbatchModule } from 'src/snapbatch/snapbatch.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Statistic.name, schema: StatisticSchema },
    ]),
    SuiModule,
    ObligationModule,
    SupplyModule,
    MintModule,
    RedeemModule,
    SnapshotModule,
    SnapbatchModule,
  ],
  providers: [StatisticService],
  exports: [StatisticService],
})
export class StatisticModule {}
