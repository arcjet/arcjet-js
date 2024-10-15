import { Query, Resolver } from '@nestjs/graphql';
import { Recipe } from './models/recipe.model.js';
import { RecipesService } from './recipes.service.js';

@Resolver(of => Recipe)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @Query(returns => [Recipe])
  recipes(): Promise<Recipe[]> {
    return this.recipesService.findAll();
  }
}
