// config/awsConfig.js — AWS SDK client configuration
const { AthenaClient } = require('@aws-sdk/client-athena');
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const REGION = process.env.AWS_REGION || 'ap-south-1';

const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const athenaClient = new AthenaClient({ region: REGION, credentials });
const s3Client = new S3Client({ region: REGION, credentials });

module.exports = { athenaClient, s3Client };
