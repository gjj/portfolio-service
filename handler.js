'use strict';

module.exports.processemail = (event, context, callback) => {
  // See https://docs.aws.amazon.com/ses/latest/DeveloperGuide/receiving-email-action-lambda-event.html
  // console.log('Received event:', JSON.stringify(event, null, 2));
  const mail = event.Records[0].ses.mail;
  const content = event.Records[0].ses.content;

  const { timestamp, source, messageId } = mail;
  // console.log('received mail', mail);

  const { from, date, to, subject } = mail.commonHeaders;

  console.log({
    from: from[0],
    to: to[0],
    subject,
    date,
    content: content,
  });

  callback(null, {
    from: from[0],
    to: to[0],
    subject,
    date,
    timestamp,
    source,
    messageId,
  });
};

module.exports.processacceptreject = (event, context, callback) => {
  // console.log('Received event:', JSON.stringify(event, null, 2));
  const sesNotification = event.Records[0].ses;

  // Check if any spam check failed
  if (
    sesNotification.receipt.spfVerdict.status === 'FAIL' ||
    sesNotification.receipt.dkimVerdict.status === 'FAIL' ||
    sesNotification.receipt.spamVerdict.status === 'FAIL' ||
    sesNotification.receipt.virusVerdict.status === 'FAIL'
  ) {
    console.log('Dropping spam');
    // Stop processing rule set, dropping message
    callback(null, { disposition: 'STOP_RULE_SET' });
  } else {
    callback(null, null);
  }
};