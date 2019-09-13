// Types for https://www.npmjs.com/package/mailhog

import { IncomingMessage } from 'http';

export interface IMailhogNodeAttachment {
  /** Filename */
  name: string;
  /** Content-Type */
  type: string;
  /** Content-Transfer-Encoding */
  encoding: string;
  /** Encoded content */
  Body: string;
}

export interface IMailhogNodeItem {
  /** Mail ID */
  ID: string;
  /** Decoded mail text content */
  text: string;
  /** Decoded mail HTML content */
  html: string;
  /** Decoded mail Subject header */
  subject: string;
  /** Decoded mail From header */
  from: string;
  /** Decoded mail To header */
  to: string;
  /** Decoded mail Cc header */
  cc: string;
  /** Decoded mail Bcc header */
  bcc: string;
  /** Decoded mail Reply-To header */
  replyTo: string;
  /** Mail Date header */
  date: Date;
  /** Mail Delivery-Date header */
  deliveryDate: Date;
  /** List of mail attachments */
  attachments: IMailhogNodeAttachment[];
}

export interface IMailhogNodeMessagesRsp {
  /** Number of results available */
  total: number;
  /** Number of results returned */
  count: number;
  /** Offset for the range of results returned */
  start: number;
  /** List of mail object items */
  items: IMailhogNodeItem[];
}

export interface IMailhogNodeOptions {
  /** API protocol */
  protocol?: string;
  /** API host */
  host?: string;
  /** API port */
  port?: number;
  /** API basic authentication */
  auth?: string;
  /** API base path */
  basePath?: string;
}

export interface IReleaseSmtpConfig {
  /** SMTP host */
  host: String;
  /** SMTP port */
  port: String;
  /** recipient email */
  email: String;
  /** SMTP username */
  username?: String;
  /** SMTP password */
  password?: String;
  /** SMTP auth type (PLAIN or CRAM-MD5) */
  mechanism?: 'PLAIN' | 'CRAM-MD5';
}

export interface IMailhogNodeClient {
  /** Mailhog Node options object*/
  options: IMailhogNodeOptions;

  /**
   * Retrieves a list of mail objects, sorted from latest to earliest.
   * @param start defines the messages query offset (default: 0)
   * @param limit defines the max number of results (default: 50)
   */
  messages(start?: number, limit?: number): Promise<IMailhogNodeMessagesRsp>;

  /**
   * Retrieves a list of mail objects for the given query, sorted from latest to earliest.
   * @param query search query
   * @param kind query kind (default: 'containing')
   * @param start defines the search query offset (default: 0)
   * @param limit 	defines the max number of results (default: 50)
   */
  search(
    query: string,
    kind?: 'from' | 'to' | 'containing',
    start?: number,
    limit?: number
  ): Promise<IMailhogNodeMessagesRsp>;

  /**
   * Retrieves the latest mail object sent from the given address.
   * @param query from address
   */
  latestFrom(query: string): Promise<IMailhogNodeMessagesRsp>;

  /**
   * Retrieves the latest mail object sent to the given address.
   * @param query to address
   */
  latestTo(query: string): Promise<IMailhogNodeMessagesRsp>;

  /**
   * Retrieves the latest mail object containing the given query.
   * @param query search query
   */
  latestContaining(query: string): Promise<IMailhogNodeMessagesRsp>;

  /**
   * Releases the mail with the given ID using the provided SMTP config.
   * @param id message ID
   * @param config SMTP configuration
   */
  releaseMessage(
    id: number,
    config: IReleaseSmtpConfig
  ): Promise<IncomingMessage>;

  /**
   * Deletes the mail with the given ID from MailHog.
   * @param id message ID
   */
  deleteMessage(id: number): Promise<IncomingMessage>;

  /**
   * Deletes all mails stored in MailHog.
   */
  deleteAll(): Promise<IncomingMessage>;

  /**
   * Encodes a String in the given charset to base64 or quoted-printable encoding.
   * @param str String to encode
   * @param encoding base64/quoted-printable
   * @param charset Charset of the input string (default: 'utf8')
   * @param lineLength Soft line break limit (default: 76)
   */
  encode(
    str: string,
    encoding: string,
    charset?: string,
    lineLength?: number
  ): string;

  /**
   * Decodes a String from the given encoding and outputs it in the given charset.
   * @param str String to decode
   * @param encoding base64/quoted-printable
   * @param charset Charset to use for the output (default: 'utf8')
   */
  decode(str: string, encoding: string, charset?: string): string;
}
