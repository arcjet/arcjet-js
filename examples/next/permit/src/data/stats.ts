export const getOrderCount = (): number => {
  // return the sum of "orders" in getToppings()
  return getToppings().reduce((acc, topping) => acc + topping.orders, 0);
};

export const getToppings = (): Array<{ name: string; orders: number }> => {
  return [
    { name: "baked beans", orders: 10 },
    { name: "black pudding", orders: 5 },
    { name: "haggis", orders: 6 },
    { name: "kimchi", orders: 8 },
    { name: "marmite", orders: 4 },
    { name: "spam", orders: 20 },
    { name: "vegemite", orders: 60 },
  ];
};
