import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'recipe ' })
export class Recipe {
  @Field(() => ID)
  id: string = '';

  @Field()
  title: string = '';

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String])
  ingredients: string[] = [];
}
