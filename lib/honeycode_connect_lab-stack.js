/*! 
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
const cdk = require('@aws-cdk/core');
const { exportPromptsToS3 } = require('./honeycode_to_s3');
const { exportPromptsToDynamoDB } = require('./honeycode_to_dynamodb');

class HoneycodeConnectLabStack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
    exportPromptsToS3(this);
    exportPromptsToDynamoDB(this);

    // The code that defines your stack goes here
  }
}

module.exports = { HoneycodeConnectLabStack }
