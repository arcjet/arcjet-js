import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ArcjetGuard, ArcjetModule, detectBot, shield } from '@arcjet/nest';

import { RecipesModule } from './recipes/recipes.module.js';

@Module({
  imports: [
    RecipesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
    }),
    ArcjetModule.forRoot({
      isGlobal: true,
      // `!` because `envFilePath` loads it.
      key: process.env.ARCJET_KEY!,
      rules: [shield({ mode: 'LIVE' }), detectBot({ mode: 'LIVE', allow: [] })],
    }),
  ],
  providers: [
    // You can enable ArcjetGuard globally on every route using the `APP_GUARD`
    // token; however, this is NOT recommended. If you need to inject the
    // ArcjetNest client, you want to make sure you aren't also running
    // ArcjetGuard on the handlers calling `protect()` to avoid making multiple
    // requests to Arcjet and you can't opt-out of this global Guard.
    {
      provide: APP_GUARD,
      useClass: ArcjetGuard,
    },
  ],
})
export class AppModule {}
