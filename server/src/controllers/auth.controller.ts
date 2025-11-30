/**
 * Auth Controller for Job4S
 * Handles OTP-based authentication: email verification and password reset
 */

import { Request, Response } from 'express';
import otpService from '../services/otp.service';
import admin from '../config/firebase';

/**
 * POST /api/auth/send-otp
 * Send OTP to email for verification or password reset
 */
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, purpose } = req.body;

    // Validate input
    if (!email || !purpose) {
      res.status(400).json({
        success: false,
        error: 'Email và mục đích (purpose) là bắt buộc',
      });
      return;
    }

    // Validate purpose
    if (!['email_verification', 'password_reset'].includes(purpose)) {
      res.status(400).json({
        success: false,
        error: 'Purpose không hợp lệ. Chấp nhận: email_verification, password_reset',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Email không hợp lệ',
      });
      return;
    }

    // For password reset, check if user exists
    if (purpose === 'password_reset') {
      try {
        await admin.auth().getUserByEmail(email);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Don't reveal that user doesn't exist for security
          res.json({
            success: true,
            message: 'Nếu email tồn tại, mã OTP sẽ được gửi đến email của bạn',
          });
          return;
        }
        throw error;
      }
    }

    // For email verification, check if email is already used
    if (purpose === 'email_verification') {
      try {
        await admin.auth().getUserByEmail(email);
        // Email already exists
        res.status(400).json({
          success: false,
          error: 'Email này đã được sử dụng',
        });
        return;
      } catch (error: any) {
        // User not found is expected for new registration
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }
    }

    // Create and send OTP
    const result = await otpService.createOTP(email, purpose);

    if (!result.success) {
      res.status(429).json({
        success: false,
        error: result.message,
        cooldownRemaining: result.cooldownRemaining,
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Không thể gửi OTP. Vui lòng thử lại sau.',
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP code
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, purpose } = req.body;

    // Validate input
    if (!email || !code || !purpose) {
      res.status(400).json({
        success: false,
        error: 'Email, mã OTP và mục đích (purpose) là bắt buộc',
      });
      return;
    }

    // Validate purpose
    if (!['email_verification', 'password_reset'].includes(purpose)) {
      res.status(400).json({
        success: false,
        error: 'Purpose không hợp lệ',
      });
      return;
    }

    // Verify OTP
    const result = otpService.verifyOTP(email, code, purpose);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message,
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      verified: true,
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Không thể xác thực OTP. Vui lòng thử lại.',
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password after OTP verification
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, newPassword } = req.body;

    // Validate input
    if (!email || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Email và mật khẩu mới là bắt buộc',
      });
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Mật khẩu phải có ít nhất 6 ký tự',
      });
      return;
    }

    // Check if OTP was verified
    if (!otpService.isOTPVerified(email, 'password_reset')) {
      res.status(403).json({
        success: false,
        error: 'Vui lòng xác thực OTP trước khi đặt lại mật khẩu',
      });
      return;
    }

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    // Update password in Firebase Auth
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });

    // Consume the OTP after successful password reset
    otpService.consumeOTP(email, 'password_reset');

    console.log(`✅ Password reset successful for ${email}`);

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);

    if (error.code === 'auth/user-not-found') {
      res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản với email này',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
    });
  }
};

/**
 * POST /api/auth/check-otp-status
 * Check if OTP is verified for a specific purpose
 */
export const checkOTPStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      res.status(400).json({
        success: false,
        error: 'Email và purpose là bắt buộc',
      });
      return;
    }

    const isVerified = otpService.isOTPVerified(email, purpose);

    res.json({
      success: true,
      verified: isVerified,
    });
  } catch (error: any) {
    console.error('Check OTP status error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi kiểm tra trạng thái OTP',
    });
  }
};

/**
 * POST /api/auth/consume-otp
 * Consume OTP after successful action (for email verification flow)
 */
export const consumeOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      res.status(400).json({
        success: false,
        error: 'Email và purpose là bắt buộc',
      });
      return;
    }

    const consumed = otpService.consumeOTP(email, purpose);

    res.json({
      success: consumed,
      message: consumed ? 'OTP đã được sử dụng' : 'OTP không tồn tại hoặc chưa được xác thực',
    });
  } catch (error: any) {
    console.error('Consume OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi xử lý OTP',
    });
  }
};
