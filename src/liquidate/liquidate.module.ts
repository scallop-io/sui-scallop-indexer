import { Module } from '@nestjs/common';
import { LiquidateService } from './liquidate.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Liquidate, LiquidateSchema } from './liquidate.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Liquidate.name, schema: LiquidateSchema },
    ]),
  ],
  providers: [LiquidateService],
  exports: [LiquidateService],
})
export class LiquidateModule {}
