import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});

export const sendEmail = async (to, subject, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"MONTRÉA" <${process.env.NODEMAILER_EMAIL}>`,
      to,
      subject,
      text:`Your OTP is ${otp}`,
      html: `<p>Your OTP is : <strong>${otp}</p>`
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
