import { Injectable } from '@nestjs/common';
import { Recipe } from './models/recipe.model.js';

@Injectable()
export class RecipesService {
  async findAll(): Promise<Recipe[]> {
    return []
  }
}
