import { Module } from '@nestjs/common';
import { CollateralService } from './collateral.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Collateral, CollateralSchema } from './collateral.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Collateral.name, schema: CollateralSchema },
    ]),
  ],
  providers: [CollateralService],
  exports: [CollateralService],
})
export class CollateralModule {}
