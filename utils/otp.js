// export const generateOTP = (length = 6) =>{
//     let otp = '';
//     for(let i = 0 ; i < length ; i++){
//         otp += Math.floor(Math.random()*10)
//     }
//     return otp
// }


import { randomInt } from 'crypto';

export const generateSecureOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += randomInt(0, 10);
  }
  return otp;
};