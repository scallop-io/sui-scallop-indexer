import { Module } from '@nestjs/common';
import { BorrowService } from './borrow.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Borrow, BorrowSchema } from './borrow.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Borrow.name, schema: BorrowSchema }]),
  ],
  providers: [BorrowService],
  exports: [BorrowService],
})
export class BorrowModule {}
