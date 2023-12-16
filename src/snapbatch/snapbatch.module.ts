import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Snapbatch, SnapbatchSchema } from './snapbatch.schema';
import { SnapbatchService } from './snapbatch.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Snapbatch.name, schema: SnapbatchSchema },
    ]),
  ],
  providers: [SnapbatchService],
  exports: [SnapbatchService],
})
export class SnapbatchModule {}
