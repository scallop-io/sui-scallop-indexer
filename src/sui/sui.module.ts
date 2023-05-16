import { Module } from '@nestjs/common';
import { SuiService } from './sui.service';
import { EventStateModule } from 'src/eventstate/eventstate.module';

@Module({
  imports: [EventStateModule],
  providers: [SuiService],
  exports: [SuiService],
})
export class SuiModule {}
