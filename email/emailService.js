const nodemailer = require('nodemailer');
const loggerWinston = require('../core/loggerWinston');

class EmailService {
  constructor(provider = 'nodemailer', config = {}) {
    this.provider = provider;
    this.config = config;
    this.transporter = null;
    this.templates = new Map();
    this.initialize();
  }

  initialize() {
    switch (this.provider) {
      case 'nodemailer':
        this.transporter = nodemailer.createTransport(this.config);
        break;
      case 'sendgrid':
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(this.config.apiKey);
        this.transporter = sgMail;
        break;
      case 'mailgun':
        const mailgun = require('mailgun.js');
        const Mailgun = require('mailgun.js/build/es5').default;
        this.transporter = new Mailgun(mailgun).client({
          username: 'api',
          key: this.config.apiKey
        });
        break;
      default:
        throw new Error(`Unsupported email provider: ${this.provider}`);
    }

    loggerWinston.info(`Email service initialized: ${this.provider}`);
  }

  /**
   * Send simple email
   */
  async sendEmail(to, subject, html, options = {}) {
    try {
      const mailOptions = {
        from: this.config.fromEmail || 'noreply@example.com',
        to,
        subject,
        html,
        ...options
      };

      let result;
      if (this.provider === 'nodemailer') {
        result = await this.transporter.sendMail(mailOptions);
      } else if (this.provider === 'sendgrid') {
        result = await this.transporter.send({
          to,
          from: mailOptions.from,
          subject,
          html
        });
      } else if (this.provider === 'mailgun') {
        result = await this.transporter.messages.create(
          this.config.domain,
          mailOptions
        );
      }

      loggerWinston.info(`Email sent to ${to}`, { subject });
      return result;
    } catch (error) {
      loggerWinston.error(`Failed to send email to ${to}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Send templated email
   */
  async sendTemplateEmail(to, templateName, data = {}) {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      const html = this.renderTemplate(template, data);
      return this.sendEmail(to, template.subject, html);
    } catch (error) {
      loggerWinston.error('Failed to send templated email', { error: error.message });
      throw error;
    }
  }

  /**
   * Register email template
   */
  registerTemplate(name, subject, html) {
    this.templates.set(name, { subject, html });
    loggerWinston.info(`Email template registered: ${name}`);
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, subject, html) {
    try {
      const results = [];
      for (const recipient of recipients) {
        const result = await this.sendEmail(recipient, subject, html);
        results.push({ recipient, success: true, result });
      }

      loggerWinston.info(`Bulk emails sent`, { count: recipients.length });
      return results;
    } catch (error) {
      loggerWinston.error('Bulk email sending failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule email
   */
  async scheduleEmail(to, subject, html, sendAt) {
    try {
      const delay = sendAt.getTime() - Date.now();
      if (delay < 0) {
        throw new Error('Schedule time must be in the future');
      }

      setTimeout(() => {
        this.sendEmail(to, subject, html).catch(err => {
          loggerWinston.error('Scheduled email failed', { error: err.message });
        });
      }, delay);

      loggerWinston.info(`Email scheduled`, { to, sendAt: sendAt.toISOString() });
    } catch (error) {
      loggerWinston.error('Failed to schedule email', { error: error.message });
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to, userName) {
    const html = `
      <h1>Welcome ${userName}!</h1>
      <p>Thanks for joining us.</p>
      <p>Get started by exploring our features.</p>
    `;
    return this.sendEmail(to, 'Welcome to our platform', html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, resetToken, resetUrl = null) {
    const url = resetUrl || `${this.config.appUrl}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${url}" style="padding: 10px 20px; background: blue; color: white; text-decoration: none; display: inline-block;">
        Reset Password
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        This link expires in 1 hour. If you didn't request a password reset, ignore this email.
      </p>
    `;
    return this.sendEmail(to, 'Password Reset Request', html);
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(to, verificationToken, verifyUrl = null) {
    const url = verifyUrl || `${this.config.appUrl}/verify-email?token=${verificationToken}`;
    const html = `
      <h1>Verify Your Email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${url}" style="padding: 10px 20px; background: green; color: white; text-decoration: none; display: inline-block;">
        Verify Email
      </a>
    `;
    return this.sendEmail(to, 'Email Verification', html);
  }

  /**
   * Send notification email
   */
  async sendNotification(to, title, message) {
    const html = `
      <h2>${title}</h2>
      <p>${message}</p>
    `;
    return this.sendEmail(to, title, html);
  }

  /**
   * Render template with data
   */
  renderTemplate(template, data) {
    let html = template.html;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, value);
    }
    return html;
  }

  /**
   * Verify email address format
   */
  static isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Send test email
   */
  async sendTestEmail() {
    try {
      const result = await this.sendEmail(
        this.config.testEmail || 'test@example.com',
        'Test Email',
        '<h1>This is a test email</h1>'
      );
      loggerWinston.info('Test email sent successfully');
      return result;
    } catch (error) {
      loggerWinston.error('Test email failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = EmailService;
