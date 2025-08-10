// Test script for floating-point precision fixes

function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function calculateApiCallSplit(amount) {
  const MAX_API_AMOUNT = 200;
  const roundedAmount = roundToTwo(amount);

  if (roundedAmount <= MAX_API_AMOUNT) {
    return [{ amount: roundedAmount, count: 1 }];
  }

  const splits = [];
  let remainingAmount = roundedAmount;

  const count200 = Math.floor(remainingAmount / 200);
  if (count200 > 0) {
    splits.push({ amount: 200, count: count200 });
    remainingAmount = roundToTwo(remainingAmount - count200 * 200);
  }

  const denominations = [100, 50, 25, 20, 15, 10];

  for (const denom of denominations) {
    if (remainingAmount >= denom) {
      const count = Math.floor(remainingAmount / denom);
      splits.push({ amount: denom, count });
      remainingAmount = roundToTwo(remainingAmount - count * denom);
    }
  }

  if (remainingAmount > 0.01) {
    splits.push({ amount: roundToTwo(remainingAmount), count: 1 });
  }

  return splits;
}

// Test problematic amounts
console.log("Testing 10 EGP:");
console.log(calculateApiCallSplit(10));

console.log("\nTesting 9.999999999999998 EGP:");
console.log(calculateApiCallSplit(9.999999999999998));

console.log("\nTesting division result:");
const problemAmount = 11.2 / 1.2;
console.log("Raw result:", problemAmount);
console.log("Rounded result:", roundToTwo(problemAmount));
console.log("Split result:", calculateApiCallSplit(problemAmount));

// Test the original problem scenario
console.log("\nTesting service fee calculation:");
const amount = 10;
const topUpAmount = roundToTwo(parseFloat(amount));
const serviceFee = roundToTwo(topUpAmount * 0.2);
const totalAmount = roundToTwo(topUpAmount + serviceFee);

console.log("Original amount:", amount);
console.log("Top-up amount:", topUpAmount);
console.log("Service fee:", serviceFee);
console.log("Total amount:", totalAmount);

const paidAmount = totalAmount;
const calculatedTopUp = roundToTwo(paidAmount / 1.2);
console.log("Calculated top-up from paid amount:", calculatedTopUp);
console.log(
  "Split result for calculated:",
  calculateApiCallSplit(calculatedTopUp)
);
