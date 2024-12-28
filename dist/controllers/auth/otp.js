"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtp = exports.sendOtpEmail = exports.verifyOtp = void 0;
const models_1 = require("../../models");
const types_1 = require("../../types");
const utility_1 = require("../../utility");
const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const [storedOtp, user] = await Promise.all([
            models_1.Otp.findOne({ email, otp }),
            models_1.User.findOne({ email })
        ]);
        if (!storedOtp) {
            next(new types_1.CustomError('Invalid OTP!', 400));
            return;
        }
        if (!user) {
            next(new types_1.CustomError('User not found!', 404));
            return;
        }
        if (user.isVerified) {
            next(new types_1.CustomError('Email already verified!', 400));
            return;
        }
        user.isVerified = true;
        await Promise.all([
            user.save(),
            models_1.Otp.deleteOne({ email, otp })
        ]);
        res.status(200).json({
            success: true,
            message: 'Email verified successfully!',
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.verifyOtp = verifyOtp;
const resendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await models_1.User.findOne({ email });
        if (!user) {
            next(new types_1.CustomError('User not found!', 404));
            return;
        }
        if (user.isVerified) {
            next(new types_1.CustomError('Email already verified!', 400));
            return;
        }
        const latestOtp = await models_1.Otp.findOne({ email }).sort({ createdAt: -1 });
        const currentTime = Date.now();
        const thirtySeconds = 60 * 1000;
        if (latestOtp && currentTime - latestOtp.createdAt.getTime() < thirtySeconds) {
            next(new types_1.CustomError('OTP requests are limited to one per 30 seconds.', 429));
            return;
        }
        sendOtpEmail(req, res, next);
        res.status(200).json({
            success: true,
            message: 'OTP sent to your email!',
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.resendOtp = resendOtp;
const sendOtpEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        const [user] = await Promise.all([
            models_1.User.findOne({ email }),
            models_1.Otp.deleteOne({ email })
        ]);
        if (!user) {
            next(new types_1.CustomError('User not found!', 404));
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpData = new models_1.Otp({
            email: email,
            otp: otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });
        await otpData.save();
        const data = `
      <body style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; width: 100%; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9fafb; box-sizing: border-box;">
              <img src="https://i.ibb.co/41hPJtW/logo.png" alt="Logo" style="width: 80%; max-width: 150px; display: block; margin: 0 auto;">
              <p style="color: #555; font-size: 18px; line-height: 1.5; text-align: center;">&nbsp;Hello ${user.name},</p>
              <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center;">Thank you for signing up for Classence! To verify your email address, please enter the One-Time Password (OTP) below:</p>
              <div style="text-align: center; margin: 20px 0;">
                  <span style="font-size: 24px; font-weight: bold; color: #066769;">${otp}</span>
              </div>
              <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center;">This OTP is valid for the next 10 minutes. Please keep it secure and do not share it with anyone.</p>
              <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center;">If you did not request this verification, please disregard this email.</p>
              <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center;">Best regards,<br>Classence Team</p>
              <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              <p style="font-size: 13px; color: #a1a1a1; text-align: center; line-height: 1.5;">
                  If you encounter any issues, please contact our support team at 
                  <a href="mailto:classence.help@gmail.com" style="color: #066769; text-decoration: none;">classence.help@gmail.com</a>.
              </p>
          </div>
      </body>
      `;
        (0, utility_1.sendEmail)(user.email, 'Your OTP for email verification', data)
            .catch((error) => { console.log("Error sending email: ", error); });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.sendOtpEmail = sendOtpEmail;