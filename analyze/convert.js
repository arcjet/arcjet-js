function ConvertProtocolEntitiesToAnalyzeEntities(entity) {
  if (entity === "email") {
    return { tag: "email" };
  }
  if (entity === "phone-number") {
    return { tag: "phone-number" };
  }
  if (entity === "ip-address") {
    return { tag: "ip-address" };
  }
  if (entity === "credit-card-number") {
    return { tag: "credit-card-number" };
  }
  return {
    tag: "custom",
    val: entity,
  };
}
function ConvertAnalyzeEntitiesToProtocolEntities(entity) {
  if (entity.tag === "email") {
    return "email";
  }
  if (entity.tag === "ip-address") {
    return "ip-address";
  }
  if (entity.tag === "credit-card-number") {
    return "credit-card-number";
  }
  if (entity.tag === "phone-number") {
    return "phone-number";
  }
  return entity.val;
}

export {
  ConvertAnalyzeEntitiesToProtocolEntities,
  ConvertProtocolEntitiesToAnalyzeEntities,
};
