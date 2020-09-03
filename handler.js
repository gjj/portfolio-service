'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.AWSREGION,
});

const simpleParser = require('mailparser').simpleParser;

module.exports.postprocess = async (event) => {
  // console.log('Received event:', JSON.stringify(event, null, 2));
  const record = event.Records[0];
  // Retrieve the email from your bucket
  const request = {
    Bucket: record.s3.bucket.name,
    Key: record.s3.object.key,
  };

  try {
    const data = await s3.getObject(request).promise();
    // console.log('Raw email:' + data.Body);
    const email = await simpleParser(data.Body);
    console.log({
      from: email.from.text,
      subject: email.subject,
      date: email.date,
      body: email.body,
    });
    return { status: 'success' };
  } catch (Error) {
    console.log(Error, Error.stack);
    return Error;
  }
};