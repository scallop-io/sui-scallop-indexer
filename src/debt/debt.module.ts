import { Module } from '@nestjs/common';
import { DebtService } from './debt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Debt, DebtSchema } from './debt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Debt.name, schema: DebtSchema }]),
  ],
  providers: [DebtService],
  exports: [DebtService],
})
export class DebtModule {}
