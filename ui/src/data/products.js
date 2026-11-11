export const money = (n) => '₹' + n.toLocaleString('en-IN');
export const discount = (p) => (p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
