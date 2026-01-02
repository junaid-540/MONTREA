
import { randomInt } from 'crypto';

export const generateSecureOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += randomInt(0, 10);
  }
  return otp;
};