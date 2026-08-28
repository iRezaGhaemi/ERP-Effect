import { Global, Module, type DynamicModule } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type DatabaseModuleOptions = {
  createDataSource: () => DataSource;
};

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DataSource,
          useFactory: options.createDataSource,
        },
      ],
      exports: [DataSource],
    };
  }
}
