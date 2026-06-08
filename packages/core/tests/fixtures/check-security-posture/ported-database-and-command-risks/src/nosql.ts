export const loadByFilter = (collection: any, request: any) => {
  return collection.find(JSON.parse(request.body.filter));
};

export const searchByRegex = (collection: any, request: any) => {
  return collection.find({ name: { $regex: request.query.q } });
};
