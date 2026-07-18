export const sleep = (ms: number):Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const generateRandomNumber = (max: number): number => { return Math.floor(Math.random() * max); };
