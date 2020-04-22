import { MailhogNodeClient, MailhogNodeOptions, Email, ReleaseSmtpConfig } from './mailhog.types';
import * as mailhog from 'mailhog';
import * as delay from 'delay';
import { IncomingMessage } from 'http';

const HTTP_SUCCESS = 200;

interface DecodingOptions {
  encoding: 'base64' | 'quoted-printable';
  charset?: string;
}

export interface FindEmailOptions {
  /** Only return emails with this exact "from" field */
  from?: string;
  /** Only return emails with this exact "to" field */
  to?: string;
  /** Only return emails with this exact "cc" field */
  cc?: string;
  /** Only return emails where the subject contains the given string */
  subject?: string;
  /** Only return emails where the body contains the given string */
  body?: string;
  /** Only return emails which where received before the given date */
  before?: Date;
  /** Only return emails which where received after the given date */
  after?: Date;
  /** Number of retries when fetching emails before giving up (default: 1)*/
  numRetries?: number;
  /** Delay between email fetching retries (default: 500ms)*/
  retryDelayMs?: number;
  /** Decoding options for email subject, text and html properties */
  decode?: DecodingOptions;
}

type DefaultOptions = Pick<FindEmailOptions, 'numRetries' | 'retryDelayMs' | 'decode'>;

export interface MailhogOptions extends MailhogNodeOptions {
  defaults?: DefaultOptions;
}

export interface MailhogError {
  reason: string;
  rsp: IncomingMessage;
}

export class MailhogClient {
  private readonly limit = 5000;
  private readonly defaults: DefaultOptions;
  private readonly mailhog: MailhogNodeClient;

  constructor(options: MailhogOptions) {
    this.defaults = options.defaults || {};
    this.mailhog = mailhog(options);
  }

  /**
   * Get all emails given a set of find options
   * @param options email find options
   */
  async getEmails(options: FindEmailOptions): Promise<Email[]> {
    const { after, before, body, cc, from, subject, to } = options;
    const numRetries = options.numRetries || this.defaults.numRetries || 1;
    const retryDelayMs = options.retryDelayMs || this.defaults.retryDelayMs || 500;
    const decode = options.decode || this.defaults.decode;

    for (let i = 0; i <= numRetries; i++) {
      let emails: Email[] = [];

      if (body) {
        const { items } = await this.mailhog.search(body, 'containing', 0, this.limit);
        emails = items;
      } else {
        const { items } = await this.mailhog.messages(0, this.limit);
        emails = items;
      }

      // Filter by find options
      emails = emails.filter(email => {
        if (from && email.from !== from) {
          return false;
        }
        if (to && email.to !== to) {
          return false;
        }
        if (cc && email.cc !== cc) {
          return false;
        }
        if (before && email.date.getTime() >= before.getTime()) {
          return false;
        }
        if (after && email.date.getTime() <= after.getTime()) {
          return false;
        }
        if (subject && !email.subject.includes(subject)) {
          return false;
        }
        return true;
      });

      if (emails.length > 0) {
        if (decode) {
          emails.forEach(email => {
            email.subject = this.decode(email.subject, decode.encoding, decode.charset);
            email.text = this.decode(email.text, decode.encoding, decode.charset);
            email.html = this.decode(email.html, decode.encoding, decode.charset);
          });
        }
        return emails;
      }

      await delay(retryDelayMs);
    }

    // No messages found
    return [];
  }

  /**
   * Get all emails.
   */
  async getAllEmails(): Promise<Email[]> {
    return this.getEmails({});
  }

  /**
   * Get the most recent email given the provided find options.
   * @param options Email find options
   */
  async getLastEmail(options: FindEmailOptions = {}): Promise<Email | undefined> {
    const emails = await this.getEmails(options);
    return emails[0];
  }

  /**
   * Delete the email with the given ID.
   * @param id ID of the email
   */
  async deleteEmail(id: string): Promise<true | MailhogError> {
    const rsp = await this.mailhog.deleteMessage(id);
    if (rsp.statusCode !== HTTP_SUCCESS) {
      return { rsp, reason: `Could not delete email with ID ${id}!` };
    }
    return true;
  }

  /**
   * Delete all emails matching the given find options
   * @param options email find options
   */
  async deleteEmails(options: FindEmailOptions): Promise<true | MailhogError[]> {
    const emails = await this.getEmails(options);
    const results = await Promise.all(emails.map(async email => this.deleteEmail(email.ID)));

    const errors = results.filter(result => result !== true) as MailhogError[];
    if (errors.length > 0) {
      return errors;
    }

    return true;
  }

  /**
   * Delete all emails.
   */
  async deleteAllEmails(): Promise<true | MailhogError[]> {
    return this.deleteEmails({});
  }

  /**
   * Releases the mail with the given ID using the provided SMTP config.
   * @param id message ID
   * @param config SMTP configuration
   */
  async releaseEmail(id: string, config: ReleaseSmtpConfig): Promise<true | MailhogError> {
    const rsp = await this.mailhog.releaseMessage(id, config);

    if (rsp.statusCode !== HTTP_SUCCESS) {
      return { rsp, reason: `Could not release email with ID ${id}!` };
    }
    return true;
  }

  /**
   * Release all emails that match the given find options using the provided SMTP config.
   * @param config SMTP configuration
   * @param options Email find options
   */
  async releaseEmails(config: ReleaseSmtpConfig, options: FindEmailOptions): Promise<true | MailhogError[]> {
    const emails = await this.getEmails(options);
    const results = await Promise.all(emails.map(email => this.releaseEmail(email.ID, config)));

    const errors = results.filter(result => result !== true) as MailhogError[];
    if (errors.length > 0) {
      return errors;
    }

    return true;
  }

  /**
   * Release all emails using the provided SMTP config.
   * @param config SMTP configuration
   */
  async releaseAllEmails(config: ReleaseSmtpConfig): Promise<true | MailhogError[]> {
    return this.releaseEmails(config, {});
  }

  /**
   * Get all emails for an inbox of an email address
   * @param email email address
   */
  async getInbox(email: string): Promise<Email[]> {
    return this.getEmails({ to: email });
  }

  /**
   * Clear the inbox of an email address
   * @param email email address
   */
  async clearInbox(email: string): Promise<true | MailhogError[]> {
    return this.deleteEmails({ to: email });
  }

  /**
   * Encodes a String in the given charset to base64 or quoted-printable encoding.
   * @param str String to encode
   * @param encoding base64/quoted-printable
   * @param charset Charset of the input string (default: 'utf8')
   * @param lineLength Soft line break limit (default: 76)
   */
  encode(str: string, encoding: 'base64' | 'quoted-printable', charset?: string, lineLength?: number): string {
    return this.mailhog.encode(str, encoding, charset, lineLength);
  }

  /**
   * Decodes a String from the given encoding and outputs it in the given charset.
   * @param str String to decode
   * @param encoding base64/quoted-printable
   * @param charset Charset to use for the output (default: 'utf8')
   */
  decode(str: string, encoding: 'base64' | 'quoted-printable', charset?: string): string {
    return this.mailhog.decode(str, encoding, charset);
  }

  /**
   * Extract all URLs from a string
   * @param str string to extract all URLs from
   */
  extractUrls(str: string): string[] {
    return str.match(
      /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/
    );
  }
}
