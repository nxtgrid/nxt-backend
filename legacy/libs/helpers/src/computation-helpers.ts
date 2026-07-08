export const addFees = (objWithFeeArray: { fee: number }[]): number =>
  objWithFeeArray.reduce((total: number, { fee }) => total + fee, 0);
