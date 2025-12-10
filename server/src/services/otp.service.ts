/**
 * OTP Service for Job4S
 * Handles OTP generation, storage, and verification
 * Used for email verification and password reset
 */

import emailService from './email.service';

interface OTPData {
  code: string;
  email: string;
  purpose: 'email_verification' | 'password_reset';
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

// In-memory store for OTPs (for production, use Redis or database)
const otpStore: Map<string, OTPData> = new Map();

// Configuration
const OTP_CONFIG = {
  length: 6,
  expirationMinutes: 10,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
};

class OTPService {
  /**
   * Generate a random OTP code
   */
  private generateOTPCode(length: number = OTP_CONFIG.length): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  /**
   * Generate storage key for OTP
   */
  private getStorageKey(email: string, purpose: OTPData['purpose']): string {
    return `${email.toLowerCase()}_${purpose}`;
  }

  /**
   * Create and store a new OTP
   */
  async createOTP(email: string, purpose: OTPData['purpose']): Promise<{ success: boolean; message: string; cooldownRemaining?: number }> {
    const storageKey = this.getStorageKey(email, purpose);
    const existingOTP = otpStore.get(storageKey);

    // Check cooldown for resend
    if (existingOTP && !existingOTP.verified) {
      const now = new Date();
      const createdAt = new Date(existingOTP.expiresAt.getTime() - OTP_CONFIG.expirationMinutes * 60 * 1000);
      const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;

      if (secondsSinceCreation < OTP_CONFIG.resendCooldownSeconds) {
        const cooldownRemaining = Math.ceil(OTP_CONFIG.resendCooldownSeconds - secondsSinceCreation);
        return {
          success: false,
          message: `Vui lòng chờ ${cooldownRemaining} giây trước khi gửi lại mã`,
          cooldownRemaining,
        };
      }
    }

    // Generate new OTP
    const code = this.generateOTPCode();
    const expiresAt = new Date(Date.now() + OTP_CONFIG.expirationMinutes * 60 * 1000);

    const otpData: OTPData = {
      code,
      email: email.toLowerCase(),
      purpose,
      expiresAt,
      attempts: 0,
      verified: false,
    };

    // Store OTP
    otpStore.set(storageKey, otpData);

    // Send email with OTP
    const emailSent = await this.sendOTPEmail(email, code, purpose);

    if (!emailSent) {
      // Remove OTP if email failed to send
      otpStore.delete(storageKey);
      return {
        success: false,
        message: 'Không thể gửi email. Vui lòng thử lại sau.',
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 OTP created for ${email} (${purpose}): ${code} - expires at ${expiresAt.toISOString()}`);
    }

    return {
      success: true,
      message: `Mã OTP đã được gửi đến ${email}`,
    };
  }

  /**
   * Verify an OTP code
   */
  verifyOTP(email: string, code: string, purpose: OTPData['purpose']): { success: boolean; message: string } {
    const storageKey = this.getStorageKey(email, purpose);
    const otpData = otpStore.get(storageKey);

    // Check if OTP exists
    if (!otpData) {
      return {
        success: false,
        message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
      };
    }

    // Check if already verified
    if (otpData.verified) {
      return {
        success: false,
        message: 'Mã OTP đã được sử dụng. Vui lòng yêu cầu mã mới.',
      };
    }

    // Check expiration
    if (new Date() > otpData.expiresAt) {
      otpStore.delete(storageKey);
      return {
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
      };
    }

    // Check max attempts
    if (otpData.attempts >= OTP_CONFIG.maxAttempts) {
      otpStore.delete(storageKey);
      return {
        success: false,
        message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
      };
    }

    // Verify code
    if (otpData.code !== code) {
      otpData.attempts += 1;
      otpStore.set(storageKey, otpData);

      const remainingAttempts = OTP_CONFIG.maxAttempts - otpData.attempts;
      return {
        success: false,
        message: `Mã OTP không chính xác. Còn ${remainingAttempts} lần thử.`,
      };
    }

    // Mark as verified
    otpData.verified = true;
    otpStore.set(storageKey, otpData);

    console.log(`✅ OTP verified for ${email} (${purpose})`);

    return {
      success: true,
      message: 'Xác thực thành công!',
    };
  }

  /**
   * Check if OTP is verified (for multi-step flows)
   */
  isOTPVerified(email: string, purpose: OTPData['purpose']): boolean {
    const storageKey = this.getStorageKey(email, purpose);
    const otpData = otpStore.get(storageKey);

    if (!otpData) return false;
    if (new Date() > otpData.expiresAt) return false;

    return otpData.verified;
  }

  /**
   * Consume verified OTP (remove after use)
   */
  consumeOTP(email: string, purpose: OTPData['purpose']): boolean {
    const storageKey = this.getStorageKey(email, purpose);
    const otpData = otpStore.get(storageKey);

    if (!otpData || !otpData.verified) return false;

    otpStore.delete(storageKey);
    console.log(`🗑️ OTP consumed for ${email} (${purpose})`);
    return true;
  }

  /**
   * Send OTP email
   */
  private async sendOTPEmail(
    email: string,
    code: string,
    purpose: OTPData['purpose']
  ): Promise<boolean> {
    const isPasswordReset = purpose === 'password_reset';
    const subject = isPasswordReset
      ? '[Job4S] Mã xác nhận đặt lại mật khẩu'
      : '[Job4S] Mã xác nhận email đăng ký';

    const title = isPasswordReset
      ? 'Đặt lại mật khẩu'
      : 'Xác nhận email';

    const description = isPasswordReset
      ? 'Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Job4S.'
      : 'Cảm ơn bạn đã đăng ký tài khoản Job4S.';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          .otp-code { 
            font-size: 36px; 
            font-weight: bold; 
            letter-spacing: 8px; 
            color: #667eea; 
            background: #f0f4ff; 
            padding: 20px 30px; 
            border-radius: 10px; 
            text-align: center;
            margin: 20px 0;
          }
          .warning { 
            background: #fff8e1; 
            border-left: 4px solid #ffc107; 
            padding: 12px 15px; 
            margin: 15px 0; 
            font-size: 14px;
          }
          h1 { margin: 0; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 ${title}</h1>
          </div>
          
          <div class="content">
            <p>Xin chào,</p>
            <p>${description}</p>
            
            <p>Đây là mã xác nhận của bạn:</p>
            
            <div class="otp-code">${code}</div>
            
            <div class="warning">
              ⏰ <strong>Lưu ý:</strong> Mã này có hiệu lực trong <strong>${OTP_CONFIG.expirationMinutes} phút</strong>.
              <br/>
              🔒 Không chia sẻ mã này với bất kỳ ai.
            </div>
            
            <p>Nếu bạn không yêu cầu ${isPasswordReset ? 'đặt lại mật khẩu' : 'tạo tài khoản'} này, vui lòng bỏ qua email này.</p>
          </div>
          
          <div class="footer">
            <p>Email tự động từ <strong>Job4S</strong></p>
            <p>Ứng dụng tìm việc cho sinh viên</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${title}

${description}

Mã xác nhận của bạn: ${code}

Lưu ý: Mã này có hiệu lực trong ${OTP_CONFIG.expirationMinutes} phút.
Không chia sẻ mã này với bất kỳ ai.

---
Email tự động từ Job4S
    `;

    return emailService.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Clean up expired OTPs (should be called periodically)
   */
  cleanupExpiredOTPs(): number {
    const now = new Date();
    let cleaned = 0;

    otpStore.forEach((data, key) => {
      if (now > data.expiresAt) {
        otpStore.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired OTPs`);
    }

    return cleaned;
  }
}

// Start periodic cleanup (every 5 minutes)
const otpService = new OTPService();
setInterval(() => otpService.cleanupExpiredOTPs(), 5 * 60 * 1000);

export default otpService;
