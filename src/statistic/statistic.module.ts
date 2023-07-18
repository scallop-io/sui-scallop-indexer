import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Statistic, StatisticSchema } from './statistic.schema';
import { StatisticService } from './statistic.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Statistic.name, schema: StatisticSchema },
    ]),
  ],
  providers: [StatisticService],
  exports: [StatisticService],
})
export class StatisticModule {}
