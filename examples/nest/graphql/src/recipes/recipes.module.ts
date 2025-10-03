import { Module } from '@nestjs/common';
import { RecipesResolver } from './recipes.resolver.js';
import { RecipesService } from './recipes.service.js';

@Module({
  providers: [RecipesResolver, RecipesService],
})
export class RecipesModule {}
