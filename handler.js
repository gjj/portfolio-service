'use strict';

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const simpleParser = require('mailparser').simpleParser;

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.AWSREGION,
});

var docClient = new AWS.DynamoDB.DocumentClient();

module.exports.postprocess = async (event, context) => {
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
    const senderAddress = email.from.value[0].address;
    console.log({
      from: senderAddress,
      subject: email.subject,
      date: email.date,
      body: email.text,
    });

    // SC
    const subject = email.subject;
    const body = email.text;
    if (subject.includes("SCBSL")) {
      if (body.includes("Order Filled")) {
        let orderSide = "";
        let stockExchange = "";
        let stockCode = "";
        let currency = "";
        let price = 0;
        let quantity = 0;

        const bodySplit = body.split("\n");

        String.prototype.indexOfEndPosition = function (string) {
          var io = this.indexOf(string);
          return io == -1 ? -1 : io + string.length;
        }

        bodySplit.forEach(line => {
          const orderSideText = "Order Side: ";
          if (line.includes(orderSideText)) {
            orderSide = line.substring(
              line.indexOfEndPosition(orderSideText),
              line.length
            );
          }
          const stockExchangeText = "Stock Exchange: ";
          if (line.includes(stockExchangeText)) {
            stockExchange = line.substring(
              line.indexOfEndPosition(stockExchangeText),
              line.length
            );
          }
          const stockCodeText = "Stock Code: ";
          if (line.includes(stockCodeText)) {
            stockCode = line.substring(
              line.indexOfEndPosition(stockCodeText),
              line.length
            );
          }

          const priceText = "Filled Price: ";
          if (line.includes(priceText)) {
            const priceAndQuantity = line.substring(
              line.indexOfEndPosition(priceText),
              line.length
            );
            [currency, price] = priceAndQuantity.split(" "); // Example format: SGD 0.635
          }
          const quantityText = "Filled Quantity: ";
          if (line.includes(quantityText)) {
            quantity = line.substring(
              line.indexOfEndPosition(quantityText),
              line.lastIndexOf(" shares")
            );
          }
        });
        const uuid = uuidv4();
        const portfolioRecord = {
          TableName: 'gs_portfolio',
          ReturnConsumedCapacity: 'TOTAL',
          Item: {
            'id': uuid,
            'email': senderAddress,
            'date': email.date.toISOString(),
            'orderSide': orderSide,
            'stockExchange': stockExchange,
            'stockCode': stockCode,
            'currency': currency,
            'price': price,
            'quantity': quantity,
          }
        };
        // Call DynamoDB to add the item to the table
        await docClient.put(portfolioRecord).promise().then(
          function (data) {
            console.log("DynamoDB success", data);
          },
          function (error) {
            console.log("DynamoDB error", error);
          }
        );

        const result = {
          id: uuid,
          email: senderAddress,
          orderSide,
          stockExchange,
          stockCode,
          currency,
          price,
          quantity,
        };
        console.log(result);
        return { status: 'success', result };
      }
    }

    return { status: 'success' };
  } catch (Error) {
    console.log(Error, Error.stack);
    return Error;
  }
};

module.exports.portfolioRecords = async (event) => {
  let responseCode = 200;
  console.log("request: " + JSON.stringify(event));

  if (event.queryStringParameters && event.queryStringParameters.email) {
    console.log("Received name: " + event.queryStringParameters.name);
    name = event.queryStringParameters.name;
  }

  const params = {
    TableName: "gs_portfolio",
    ProjectionExpression: "id, email, date, orderSide, stockExchange, stockCode, currency, price, quantity",
    FilterExpression: "email equal :email",
    ExpressionAttributeValues: {
      ":email": email,
    }
  };
  // Call DynamoDB to add the item to the table
  await docClient.put(params).promise().then(
    function (data) {
      console.log("DynamoDB success", data);
    },
    function (error) {
      console.log("DynamoDB error", error);
    }
  );

  let responseBody = {
    message: greeting,
    input: event
  };

  // The output from a Lambda proxy integration must be 
  // in the following JSON object. The 'headers' property 
  // is for custom response headers in addition to standard 
  // ones. The 'body' property  must be a JSON string. For 
  // base64-encoded payload, you must also set the 'isBase64Encoded'
  // property to 'true'.
  let response = {
    statusCode: responseCode,
    headers: {
      "x-custom-header": "my custom header value"
    },
    body: JSON.stringify(responseBody)
  };
  console.log("response: " + JSON.stringify(response))
  return response;
};