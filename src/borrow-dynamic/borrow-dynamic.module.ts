import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BorrowDynamic, BorrowDynamicSchema } from './borrow-dynamic.schema';
import { BorrowDynamicService } from './borrow-dynamic.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BorrowDynamic.name, schema: BorrowDynamicSchema },
    ]),
  ],
  providers: [BorrowDynamicService],
  exports: [BorrowDynamicService],
})
export class BorrowDynamicModule {}
