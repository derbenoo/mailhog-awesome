import { MailhogNodeClient, MailhogNodeOptions, Email } from './mailhog.types';
import * as mailhog from 'mailhog';
import * as delay from 'delay';
import { IncomingMessage } from 'http';

type Without<T, K> = Partial<{ [L in Exclude<keyof T, K>]: T[L] }>;

const HTTP_SUCCESS = 200;

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
  /** Skip the given number of emails */
  offset?: number;
  /** Return at maximum the given number of emails */
  limit?: number;
  /** Number of retries when fetching emails before giving up */
  numRetries?: number;
  /** Delay between email fetching retries */
  retryDelayMs?: number;
}

export interface MailhogOptions extends MailhogNodeOptions {
  defaults?: FindEmailOptions;
}

export interface MailhogError {
  reason: string;
  rsp: IncomingMessage;
}

export class MailhogClient {
  private readonly globalLimit = 5000;
  private readonly defaults: FindEmailOptions;
  private readonly mailhog: MailhogNodeClient;

  constructor(options: MailhogOptions) {
    this.defaults = options.defaults || {};
    this.mailhog = mailhog(options);
  }

  /**
   * Get all emails given a set of find options
   * @param options email find options
   */
  async getAllEmails(options: FindEmailOptions = {}): Promise<Email[]> {
    const from = options.from || this.defaults.from;
    const to = options.to || this.defaults.to;
    const cc = options.cc || this.defaults.cc;

    const before = options.before || this.defaults.before;
    const after = options.after || this.defaults.after;

    const subject = options.subject || this.defaults.subject;
    const body = options.body || this.defaults.body;

    const start = options.offset || this.defaults.offset || 0;
    const limit = options.limit || this.defaults.limit || 50;

    const numRetries = options.numRetries || this.defaults.numRetries || 0;
    const retryDelayMs = options.retryDelayMs || this.defaults.retryDelayMs || 500;

    for (let i = 0; i < numRetries; i++) {
      let emails: Email[] = [];

      if (body) {
        const { items } = await this.mailhog.search(body, 'containing', 0, this.globalLimit);
        emails = items;
      } else {
        const { items } = await this.mailhog.messages(0, this.globalLimit);
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
        return emails.slice(start, start + limit);
      }

      await delay(retryDelayMs);
    }

    // No messages found
    return [];
  }

  /**
   * Get all emails for an inbox of an email address
   * @param email email address
   * @param options email find options
   */
  async getInbox(email: string, options: Without<FindEmailOptions, 'to'> = {}): Promise<Email[]> {
    return this.getAllEmails({
      ...options,
      to: email,
    });
  }

  /**
   * Clear the inbox of an email address
   * @param email email address
   */
  async clearInbox(email: string): Promise<true | MailhogError[]> {
    const messages = await this.getInbox(email);
    const responses = await Promise.all(messages.map(message => this.mailhog.deleteMessage(message.ID)));

    // Check for deletion errors
    const errors = messages
      .map((message, index) => ({ msg: message, rsp: responses[index] }))
      .filter(result => result.rsp.statusCode !== HTTP_SUCCESS);

    return errors.length > 0
      ? errors.map(error => ({ rsp: error.rsp, reason: `Could not delete message with ID ${error.msg.ID}!` }))
      : true;
  }

  /**
   * Clear all emails
   */
  async clearAllEmails(): Promise<true | MailhogError> {
    const rsp = await this.mailhog.deleteAll();
    return rsp.statusCode === HTTP_SUCCESS ? true : { rsp, reason: 'Could not clear all messages!' };
  }

  /**
   * Get all emails for a sender's email address
   * @param email sender's email address
   * @param options email find options
   */
  async getEmailsForSender(email: string, options: Without<FindEmailOptions, 'from'> = {}): Promise<Email[]> {
    return this.getAllEmails({
      ...options,
      from: email,
    });
  }
}
