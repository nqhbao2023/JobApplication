/**
 * Email Service for Job4S
 * Handles email notifications for quick-post applications
 * Using Nodemailer with Gmail SMTP (can be changed to SendGrid/AWS SES)
 */

import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   * Requires env variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
   */
  private initializeTransporter() {
    const {
      SMTP_HOST = 'smtp.gmail.com',
      SMTP_PORT = '587',
      SMTP_USER,
      SMTP_PASS,
    } = process.env;

    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️  Email service not configured. Set SMTP_USER and SMTP_PASS in .env');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not available. Skipping email send.');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Job4S" <noreply@job4s.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      console.log('📧 Email sent:', info.messageId);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email:', error.message);
      return false;
    }
  }

  /**
   * Send application notification to quick-post poster
   */
  async notifyQuickPostApplication(
    posterEmail: string,
    jobTitle: string,
    candidateName: string,
    candidateEmail: string,
    candidatePhone?: string,
    cvUrl?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          h1 { margin: 0; font-size: 24px; }
          h2 { color: #667eea; font-size: 20px; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Có ứng viên mới!</h1>
          </div>
          
          <div class="content">
            <h2>Thông tin ứng tuyển</h2>
            <p>Bạn có một ứng viên mới cho tin tuyển dụng:</p>
            
            <div class="info-box">
              <strong>📋 Vị trí:</strong> ${jobTitle}
            </div>
            
            <h2>Thông tin ứng viên</h2>
            <div class="info-box">
              <p><strong>👤 Họ tên:</strong> ${candidateName}</p>
              <p><strong>📧 Email:</strong> ${candidateEmail}</p>
              ${candidatePhone ? `<p><strong>📱 Số điện thoại:</strong> ${candidatePhone}</p>` : ''}
            </div>
            
            ${cvUrl ? `
              <p style="text-align: center;">
                <a href="${cvUrl}" class="button">📄 Xem CV của ứng viên</a>
              </p>
            ` : ''}
            
            <p>Vui lòng liên hệ trực tiếp với ứng viên để sắp xếp phỏng vấn.</p>
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
Có ứng viên mới cho tin: ${jobTitle}

Thông tin ứng viên:
- Họ tên: ${candidateName}
- Email: ${candidateEmail}
${candidatePhone ? `- Số điện thoại: ${candidatePhone}` : ''}
${cvUrl ? `- CV: ${cvUrl}` : ''}

Vui lòng liên hệ trực tiếp với ứng viên.

---
Email tự động từ Job4S
    `;

    return this.sendEmail({
      to: posterEmail,
      subject: `[Job4S] Có ứng viên mới: ${jobTitle}`,
      html,
      text,
    });
  }

  /**
   * Send application notification to employer (for regular jobs)
   */
  async sendJobApplicationNotification(
    employerEmail: string,
    jobTitle: string,
    candidateName: string,
    candidateEmail: string,
    candidatePhone?: string,
    cvUrl?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          h1 { margin: 0; font-size: 24px; }
          h2 { color: #667eea; font-size: 20px; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Ứng viên mới ứng tuyển!</h1>
          </div>
          
          <div class="content">
            <h2>Thông tin ứng tuyển</h2>
            <p>Có ứng viên mới ứng tuyển vào vị trí:</p>
            
            <div class="info-box">
              <strong>📋 Vị trí:</strong> ${jobTitle}
            </div>
            
            <h2>Thông tin ứng viên</h2>
            <div class="info-box">
              <p><strong>👤 Họ tên:</strong> ${candidateName}</p>
              <p><strong>📧 Email:</strong> ${candidateEmail}</p>
              ${candidatePhone ? `<p><strong>📱 Số điện thoại:</strong> ${candidatePhone}</p>` : ''}
            </div>
            
            ${cvUrl ? `
              <p style="text-align: center;">
                <a href="${cvUrl}" class="button">📄 Xem CV của ứng viên</a>
              </p>
            ` : ''}
            
            <p>Đăng nhập vào Job4S để xem chi tiết hồ sơ và quản lý ứng viên.</p>
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
Ứng viên mới ứng tuyển: ${jobTitle}

Thông tin ứng viên:
- Họ tên: ${candidateName}
- Email: ${candidateEmail}
${candidatePhone ? `- Số điện thoại: ${candidatePhone}` : ''}
${cvUrl ? `- CV: ${cvUrl}` : ''}

Đăng nhập vào Job4S để xem chi tiết.

---
Email tự động từ Job4S
    `;

    return this.sendEmail({
      to: employerEmail,
      subject: `[Job4S] Ứng viên mới: ${jobTitle}`,
      html,
      text,
    });
  }

  /**
   * Send welcome email to quick-post creator
   */
  async sendQuickPostConfirmation(
    posterEmail: string,
    jobTitle: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          h1 { margin: 0; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Tin đã được tạo!</h1>
          </div>
          
          <div class="content">
            <p>Cảm ơn bạn đã đăng tin tuyển dụng trên <strong>Job4S</strong>!</p>
            
            <p><strong>Tiêu đề:</strong> ${jobTitle}</p>
            
            <p>Tin của bạn đang chờ admin duyệt. Thông thường quá trình này mất khoảng <strong>24 giờ</strong>.</p>
            
            <p>Sau khi được duyệt, sinh viên sẽ có thể xem và ứng tuyển. Bạn sẽ nhận email thông báo khi có ứng viên.</p>
            
            <p>Chúc bạn tìm được ứng viên phù hợp! 🎉</p>
          </div>
          
          <div class="footer">
            <p>Email tự động từ <strong>Job4S</strong></p>
            <p>Ứng dụng tìm việc cho sinh viên</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: posterEmail,
      subject: `[Job4S] Tin đã được tạo: ${jobTitle}`,
      html,
    });
  }

  /**
   * ✅ NEW: Send notification when quick-post is approved
   */
  async sendQuickPostApproved(
    posterEmail: string,
    jobTitle: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
          h1 { margin: 0; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">🎉</div>
            <h1>Tin đã được duyệt!</h1>
          </div>
          
          <div class="content">
            <p>Chúc mừng! Tin tuyển dụng của bạn đã được admin duyệt và đang hiển thị trên <strong>Job4S</strong>.</p>
            
            <p><strong>📋 Tiêu đề:</strong> ${jobTitle}</p>
            
            <p>Từ giờ, nhà tuyển dụng có thể xem và liên hệ với bạn. Bạn sẽ nhận email thông báo khi có người quan tâm.</p>
            
            <p>Chúc bạn sớm tìm được công việc phù hợp! 🚀</p>
          </div>
          
          <div class="footer">
            <p>Email tự động từ <strong>Job4S</strong></p>
            <p>Ứng dụng tìm việc cho sinh viên</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: posterEmail,
      subject: `[Job4S] ✅ Tin đã được duyệt: ${jobTitle}`,
      html,
    });
  }

  /**
   * ✅ NEW: Send notification when quick-post is rejected
   */
  async sendQuickPostRejected(
    posterEmail: string,
    jobTitle: string,
    reason?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          .reason-box { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 15px 0; }
          h1 { margin: 0; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Tin không được duyệt</h1>
          </div>
          
          <div class="content">
            <p>Rất tiếc, tin tuyển dụng của bạn không được duyệt trên <strong>Job4S</strong>.</p>
            
            <p><strong>📋 Tiêu đề:</strong> ${jobTitle}</p>
            
            ${reason ? `
              <div class="reason-box">
                <strong>📝 Lý do:</strong><br/>
                ${reason}
              </div>
            ` : ''}
            
            <p>Bạn có thể đăng lại tin với nội dung phù hợp hơn. Một số lưu ý:</p>
            <ul>
              <li>Tiêu đề rõ ràng, mô tả công việc đang tìm</li>
              <li>Thông tin liên hệ hợp lệ</li>
              <li>Không chứa nội dung spam hoặc không phù hợp</li>
            </ul>
            
            <p>Nếu có thắc mắc, vui lòng liên hệ support.</p>
          </div>
          
          <div class="footer">
            <p>Email tự động từ <strong>Job4S</strong></p>
            <p>Ứng dụng tìm việc cho sinh viên</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: posterEmail,
      subject: `[Job4S] ❌ Tin không được duyệt: ${jobTitle}`,
      html,
    });
  }
}

export default new EmailService();
