<img src="https://github.com/derbenoo/mailhog-awesome/raw/master/docs/mailhog-awesome.png?sanitize=true" alt="mailhog-awesome" />

<p align="center">
NodeJS mailhog client library for email end-to-end testing, written in TypeScript.
</p>

[![npm](https://img.shields.io/npm/v/mailhog-awesome.svg?color=007acc)](https://www.npmjs.com/package/mailhog-awesome) [![GitHub](https://img.shields.io/github/license/derbenoo/mailhog-awesome.svg?color=007acc)](https://github.com/derbenoo/mailhog-awesome/blob/master/LICENSE) [![npm bundle size](https://img.shields.io/bundlephobia/min/mailhog-awesome.svg?color=007acc)](https://www.npmjs.com/package/mailhog-awesome)
[![Snyk Vulnerabilities for npm package](https://img.shields.io/snyk/vulnerabilities/npm/mailhog-awesome.svg)](https://snyk.io/test/npm/mailhog-awesome) [![CircleCI (all branches)](https://img.shields.io/circleci/project/github/derbenoo/mailhog-awesome.svg)](https://circleci.com/gh/derbenoo/mailhog-awesome) 

## :wave: Description

NodeJS client library for [mailhog](https://github.com/mailhog/MailHog), based on the mailhog [npm package](https://www.npmjs.com/package/mailhog). Mailhog is an excellent email testing tool for local development and automated end-to-end testing. While an HTTP API is offerend for implementing tests (e.g. "expect that the reset password email was retrieved"), it is very limited in its capabilities and is not well suited for writing tests. The `mailhog-awesome` package attempts to solve these issues by providing an API that enables developers to write simple and robust email tests. 

The following functionality is provided:

- Inbox system for isolated testing (needed to run tests in parallel)
- Built-in retry logic for email retrieval
- Comprehensive TypeScript typings

## :running: Get Started


```ts
  mailhog = new MailhogClient({
    host: 'localhost',
    port: 8025,
  });

  const emails = await mailhog.getInbox('test1@localhost.org');
```

A simple Jest example test-suite:

```ts
import { createTransport } from 'nodemailer';
import { MailhogClient } from './mailhog';

describe('Example Jest email test-suite', () => {
  let mailhog: MailhogClient;
  const host = 'mailhog';

  beforeAll(async () => {
    mailhog = new MailhogClient({
      host,
      port: 8025,
    });
  });

  it('Retrieve the "reset password" email', async () => {
    // Inbox email only used for this test
    const inbox = 'user1@your-domain.com';

    // Clear the inbox before starting
    await mailhog.clearInbox(inbox);

    // Trigger the "reset password" email via your server's API
    const transport = createTransport({ host, port: 1025, secure: false });
    transport.sendMail({
      from: 'system@your-domain.com',
      to: inbox,
      subject: 'Reset your password',
      html: 'Please follow the link to reset your password.',
    });

    // Get the latest email
    const email = await mailhog.getLastEmail({
      from: 'system@your-domain.com',
      to: inbox,
      subject: 'Reset your password',
    });

    // Expect that a "reset password" email was received
    expect(email).toBeTruthy();

    // Clear inbox after the test has passed
    await mailhog.clearInbox(inbox);
  });
});
```

## :wrench: API


▸ **getInbox**(`email`: string): *Promise‹Email[]›*

Get all emails for an inbox of an email address

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`email` | string | email address  |

**Returns:** *Promise‹Email[]›*


---


▸ **clearInbox**(`email`: string): *Promise‹true | MailhogError[]›*

Clear the inbox of an email address

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`email` | string | email address  |

**Returns:** *Promise‹true | MailhogError[]›*


---

▸ **getEmails**(`options`: FindEmailOptions): *Promise‹Email[]›*

Get all emails given a set of find options

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`options` | FindEmailOptions | email find options  |

**Returns:** *Promise‹Email[]›*


---


▸ **getAllEmails**(): *Promise‹Email[]›*

Get all emails.

**Returns:** *Promise‹Email[]›*



---


▸ **getLastEmail**(`options`: FindEmailOptions): *Promise‹Email | undefined›*

Get the most recent email given the provided find options.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`options` | FindEmailOptions |  {} | Email find options  |

**Returns:** *Promise‹Email | undefined›*


---

▸ **deleteEmail**(`id`: string): *Promise‹true | MailhogError›*

Delete the email with the given ID.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`id` | string | ID of the email  |

**Returns:** *Promise‹true | MailhogError›*


---

▸ **deleteEmails**(`options`: FindEmailOptions): *Promise‹true | MailhogError[]›*

Delete all emails matching the given find options

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`options` | FindEmailOptions | email find options  |

**Returns:** *Promise‹true | MailhogError[]›*


---


▸ **deleteAllEmails**(): *Promise‹true | MailhogError[]›*

Delete all emails.

**Returns:** *Promise‹true | MailhogError[]›*


---

▸ **releaseEmail**(`id`: string, `config`: ReleaseSmtpConfig): *Promise‹true | MailhogError›*

Releases the mail with the given ID using the provided SMTP config.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`id` | string | message ID |
`config` | ReleaseSmtpConfig | SMTP configuration  |

**Returns:** *Promise‹true | MailhogError›*


---

▸ **releaseEmails**(`config`: ReleaseSmtpConfig, `options`: FindEmailOptions): *Promise‹true | MailhogError[]›*

Release all emails that match the given find options using the provided SMTP config.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`config` | ReleaseSmtpConfig | SMTP configuration |
`options` | FindEmailOptions | Email find options  |

**Returns:** *Promise‹true | MailhogError[]›*


---

▸ **releaseAllEmails**(`config`: ReleaseSmtpConfig): *Promise‹true | MailhogError[]›*

Release all emails using the provided SMTP config.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`config` | ReleaseSmtpConfig | SMTP configuration  |

**Returns:** *Promise‹true | MailhogError[]›*


---


▸ **encode**(`str`: string, `encoding`: string, `charset?`: string, `lineLength?`: number): *string*

Encodes a String in the given charset to base64 or quoted-printable encoding.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`str` | string | String to encode |
`encoding` | string | base64/quoted-printable |
`charset?` | string | Charset of the input string (default: 'utf8') |
`lineLength?` | number | Soft line break limit (default: 76)  |

**Returns:** *string*


---

▸ **decode**(`str`: string, `encoding`: string, `charset?`: string): *string*

Decodes a String from the given encoding and outputs it in the given charset.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`str` | string | String to decode |
`encoding` | string | base64/quoted-printable |
`charset?` | string | Charset to use for the output (default: 'utf8')  |

**Returns:** *string*


## :rotating_light: Known Issues

- The "bcc" field is not retrieved by mailhog. 
- Not optimized for performance on large sets of emails: Due to the limited functionality offered by the mailhog web API, the `mailhog-awesome` package has to perform operations that have a sub-optimal runtime complexity, which will be noticeable for larger amounts of emails. As the primary focus of this package is the implementation of end-to-end email tests, this can be easily avoided by properly isolating test suites and clearing the inbox after a test has finished. 

## :pray: Contributing

You are welcome to contribute to the mailhog-awesome GitHub repository! All infos can be found here: [How to contribute](https://github.com/derbenoo/mailhog-awesome/blob/master/CONTRIBUTING.md)

## :book: License

Mailhog-awesome is [MIT licensed](https://github.com/derbenoo/mailhog-awesome/blob/master/LICENSE).
