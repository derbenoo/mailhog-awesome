import { createTransport, Transporter, SendMailOptions } from 'nodemailer';
import { MailhogClient } from './mailhog';
import * as delay from 'delay';

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

  it('[SENDER-1] Retrieve emails for a sender address', async () => {
    const recipient = 'sender-1-rcp@localhost.noexist';
    const sender = 'sender-1-sender@localhost.noexist';

    const email: SendMailOptions = {
      subject: 'Sender-1 Email subject',
      to: recipient,
      from: sender,
      html: 'does not matter',
    };

    await smtpTransport.sendMail(email);

    const emails = await mailhog.getEmailsForSender(sender);
    expect(emails.length).toBe(1);
    expect(emails[0]).toMatchObject(email);
  });

  it('[INBOX-1] Retrieve an email via inbox', async () => {
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

  it('[INBOX-2] Retrieve filtered emails for inbox', async () => {
    const recipient = 'inbox-2-rcp@localhost.noexist';

    const emailOptions: SendMailOptions[] = [
      {
        subject: 'INBOX-2 Email 1',
        to: recipient,
        from: 'inbox-2-sender-1@localhost.noexist',
        html: 'INBOX-2 Body 1',
      },
      {
        subject: 'INBOX-2 Email 2',
        to: recipient,
        cc: 'inbox-2-cc-1@localhost.noexist',
        from: 'inbox-2-sender-2@localhost.noexist',
        html: 'INBOX-2 Body 2',
      },
      {
        subject: 'INBOX-2 Email 3',
        to: recipient,
        cc: 'inbox-2-cc-1@localhost.noexist',
        bcc: 'inbox-2-bcc-1@localhost.noexist',
        from: 'inbox-2-sender-1@localhost.noexist',
        html: 'INBOX-2 Body 3',
      },
      {
        subject: 'INBOX-2 Email 4',
        to: recipient,
        bcc: 'inbox-2-bcc-2@localhost.noexist',
        from: 'inbox-2-sender-2@localhost.noexist',
        html: 'INBOX-2 Body 4',
      },
    ];

    // Send all emails
    await Promise.all(emailOptions.map(email => smtpTransport.sendMail(email)));

    // Check CC filter
    const ccEmails = await mailhog.getInbox(recipient, { cc: 'inbox-2-cc-1@localhost.noexist' });
    expect(ccEmails.length).toBe(2);
    expect(ccEmails.map(email => email.subject).sort()).toEqual(['INBOX-2 Email 2', 'INBOX-2 Email 3']);

    // Check before filter
    const beforeEmails1 = await mailhog.getInbox(recipient, { before: new Date(Date.now() + 20000) });
    expect(beforeEmails1.length).toBe(4);
    const beforeEmails2 = await mailhog.getInbox(recipient, { before: new Date(Date.now() - 20000) });
    expect(beforeEmails2.length).toBe(0);

    // Check after filter
    const afterEmails1 = await mailhog.getInbox(recipient, { after: new Date(Date.now() - 20000) });
    expect(afterEmails1.length).toBe(4);
    const afterEmails2 = await mailhog.getInbox(recipient, { after: new Date(Date.now() + 20000) });
    expect(afterEmails2.length).toBe(0);
  });

  it('[DELAY-1] Receive a delayed email', async () => {
    const recipient = 'delay-1-rcp@localhost.noexist';
    const sender = 'delay-1-sender@localhost.noexist';

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

  it('[SEARCH-1] Search for emails in inbox', async () => {
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

  it('[LAST-1] Get the last email', async () => {
    const recipient = 'last-1-rcp@localhost.noexist';
    const sender = 'last-1-sender@localhost.noexist';

    const email1: SendMailOptions = {
      subject: 'LAST-1 Email 1',
      to: recipient,
      from: sender,
      html: 'does not matter',
    };
    await smtpTransport.sendMail(email1);

    await delay(250);

    const email2: SendMailOptions = {
      subject: 'LAST-1 Email 2',
      to: recipient,
      from: sender,
      html: 'does not matter',
    };
    await smtpTransport.sendMail(email2);

    // Get email
    const email = await mailhog.getLastEmail({ to: recipient });
    expect(email).toBeTruthy();
    expect(email.subject).toBe('LAST-1 Email 2');
  });
});
