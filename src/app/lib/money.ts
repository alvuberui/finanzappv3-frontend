import Decimal from "decimal.js";

export function sumMoney(values: Array<number | string | null | undefined>): number {
  return values.reduce((total, value) => total.plus(value ?? 0), new Decimal(0)).toNumber();
}

export function subtractMoney(
  base: number | string,
  ...values: Array<number | string | null | undefined>
): number {
  return values.reduce((total, value) => total.minus(value ?? 0), new Decimal(base)).toNumber();
}

export function percentageMoney(value: number | string, percentage: number | string): number {
  return new Decimal(value).mul(percentage).div(100).toNumber();
}
