import { createTransport, Transporter, SendMailOptions } from 'nodemailer';
import { MailhogClient } from './mailhog';

describe('Mailhog Client end-to-end tests', () => {
  const host = 'mailhog';
  const smtpPort = 1025;
  const webPort = 8025;

  let smtpTransport: Transporter;
  let mailhog: MailhogClient;

  beforeAll(async () => {
    smtpTransport = createTransport({ host, port: smtpPort, secure: false });
    mailhog = new MailhogClient({
      host,
      port: webPort,
      defaults: {
        numRetries: 2,
        retryDelayMs: 200,
      },
    });

    // Clear before starting
    await mailhog.clearAllEmails();
  });

  afterAll(async () => {
    // Clear before finishing
    await mailhog.clearAllEmails();
  });

  it('[INBOX-1] Retrieve an email via getInbox', async () => {
    const recipient = 'inbox-1-rcp@localhost.noexist';
    const sender = 'inbox-1-sender@localhost.noexist';

    const email: SendMailOptions = {
      subject: 'INBOX-1 Email subject',
      to: recipient,
      from: sender,
      html: 'does not matter',
    };

    await smtpTransport.sendMail(email);

    const emails = await mailhog.getInbox(recipient);
    expect(emails.length).toBe(1);
    expect(emails[0]).toMatchObject(email);
  });

  it('[DELAY-1] Receive a delayed email', async () => {
    const recipient = 'delay-1-rcp@localhost.noexist';
    const sender = 'delay-1-sender@localhost.noexist';

    await mailhog.clearInbox(recipient);

    // Send a delayed email
    setTimeout(() => {
      smtpTransport.sendMail({
        subject: 'Mail delayed by 500ms',
        to: recipient,
        from: sender,
        html: 'does not matter',
      });
    }, 500);

    // Get email
    const emails = await mailhog.getInbox(recipient, { retryDelayMs: 500, numRetries: 5 });
    expect(emails.length).toBe(1);
  });

  it('[DELAY-2] Give up email retrieval', async () => {
    const recipient = 'delay-2-rcp@localhost.noexist';

    await mailhog.clearInbox(recipient);
    // Get email
    const emails = await mailhog.getInbox(recipient);
    expect(emails.length).toBe(0);
  });

  it('[SEARCH-1] Search for emails', async () => {
    const recipient = 'search-1-rcp@localhost.noexist';
    const sender = 'search-1-sender@localhost.noexist';

    const email: SendMailOptions = {
      subject: 'INBOX-1 Email subject',
      to: recipient,
      from: sender,
      text: 'NOT-FOUND',
    };

    await Promise.all(
      ['NO SEARSTR', 'YES SEARCH-STR', 'NO SEARCH-ST', 'YES SEAR SEARCH-STR YES', 'SEARCH-STR'].map(
        async (text: string) => {
          await smtpTransport.sendMail({ ...email, text });
        }
      )
    );

    const emails = await mailhog.getInbox(recipient, { body: 'SEARCH-STR' });
    expect(emails.length).toBe(3);
  });
});
