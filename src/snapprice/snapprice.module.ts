import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Snapprice, SnappriceSchema } from './snapprice.schema';
import { SnappriceService } from './snapprice.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Snapprice.name, schema: SnappriceSchema },
    ]),
  ],
  providers: [SnappriceService],
  exports: [SnappriceService],
})
export class SnappriceModule {}
