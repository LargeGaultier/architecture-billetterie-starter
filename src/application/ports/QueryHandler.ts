export interface QueryHandler<Query, Dto> {
  execute(query: Query): Promise<Dto>;
}
