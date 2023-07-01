import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Flashloan, FlashloanSchema } from './flashloan.schema';
import { FlashloanService } from './flashloan.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Flashloan.name, schema: FlashloanSchema },
    ]),
  ],
  providers: [FlashloanService],
  exports: [FlashloanService],
})
export class FlashloanModule {}
