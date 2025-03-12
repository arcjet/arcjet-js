import { Query, Resolver } from '@nestjs/graphql';
import { Recipe } from './models/recipe.model.js';
import { RecipesService } from './recipes.service.js';

@Resolver(() => Recipe)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @Query(() => [Recipe])
  recipes(): Recipe[] {
    return this.recipesService.findAll();
  }
}
