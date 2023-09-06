import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mint, MintSchema } from './mint.schema';
import { MintService } from './mint.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mint.name, schema: MintSchema }]),
  ],
  providers: [MintService],
  exports: [MintService],
})
export class MintModule {}
