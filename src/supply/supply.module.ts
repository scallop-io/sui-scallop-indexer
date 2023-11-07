import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supply, SupplySchema } from './supply.schema';
import { SupplyService } from './supply.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Supply.name, schema: SupplySchema }]),
  ],
  providers: [SupplyService],
  exports: [SupplyService],
})
export class SupplyModule {}
