import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Snapairdrop, SnapairdropSchema } from './snapairdrop.schema';
import { SnapairdropService } from './snapairdrop.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Snapairdrop.name, schema: SnapairdropSchema },
    ]),
  ],
  providers: [SnapairdropService],
  exports: [SnapairdropService],
})
export class SnapairdropModule {}
