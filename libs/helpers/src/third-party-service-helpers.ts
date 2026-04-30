import { removeWs } from './primitive-helpers';
const isDev = process.env.NXT_ENV !== 'production';

export const createFlutterwaveReference = (identifier: string) =>
  `${ isDev ? 'DEV__' : '' }${ removeWs(identifier) }__${ new Date().toISOString() }`;

export const inferBrokerIndexByVrmId = (vrmId: string) => {
  let sum = 0;
  for (let i = 0; i < vrmId.length; i++) {
    sum += vrmId.charCodeAt(i);
  }
  return sum % 128;
};
