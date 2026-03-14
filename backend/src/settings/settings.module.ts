import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  exports: [TypeOrmModule],
})
export class SettingsModule {}
