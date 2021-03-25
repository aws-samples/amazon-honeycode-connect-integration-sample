/*! 
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
const cdk = require('@aws-cdk/core');
const lambda = require('@aws-cdk/aws-lambda');
const events = require('@aws-cdk/aws-events');
const targets = require('@aws-cdk/aws-events-targets');
const iam = require('@aws-cdk/aws-iam');
const dynamodb = require('@aws-cdk/aws-dynamodb');
// const { DynamoEventSource } = require('@aws-cdk/aws-lambda-event-sources');
// const { AwsCustomResource, AwsCustomResourcePolicy } = require('@aws-cdk/custom-resources');

const environment = require('../lambda/env.json');

// const tableData = require('../data/customers-dynamodb.json');

function exportPromptsToDynamoDB(scope) {
    
    // Create Dynamodb table 
    const promptsTable = new dynamodb.Table(scope, 'Prompts', {
        partitionKey: { name: 'MsgGroup', type: dynamodb.AttributeType.STRING },
        stream: dynamodb.StreamViewType.NEW_IMAGE,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    // Honeycode to Dynamo - pushes messages from HC to Dynamo
    const promptsLambda = new lambda.Function(scope, 'SavePromptsToDynamoDB', {
        description: 'Invoked to move Prompts to Dynamodb',
        code: lambda.Code.fromAsset('lambda/SavePromptsToDynamoDB'),
        handler: 'index.handler',
        runtime: lambda.Runtime.NODEJS_12_X,
        environment,
        timeout: cdk.Duration.minutes(1), //Give enough time for batch upserts
    });


    // Connect Lambda Function - pulls messages from Dynamo on behalf or Connect
    const pullerLambda = new lambda.Function(scope, 'ConnectPullPromptsFromDynamoDB', {
        description: 'Invoked by Connect to pull a message from dynamo db',
        code: lambda.Code.fromAsset('lambda/ConnectPullPromptsFromDynamoDB'),
        handler: 'index.handler',
        runtime: lambda.Runtime.NODEJS_12_X,
        environment,
        timeout: cdk.Duration.minutes(1), //Give enough time for batch upserts
    });

    
    // Run lambda every minute
    const promptsToDynamoDBRule = new events.Rule(scope, 'PromptsToDynamoDBRule', {
        schedule: events.Schedule.expression('rate(1 minute)')
    });
    promptsToDynamoDBRule.addTarget(new targets.LambdaFunction(promptsLambda));

    // grant write access to prompts lambda function
    //promptsTable.grantWrite(promptsLambda);
    promptsTable.grantReadWriteData(promptsLambda);
    promptsTable.grantReadWriteData(pullerLambda);
    
    // Add tableName to Lambda Environment
    promptsLambda.addEnvironment('dynamodbTable', promptsTable.tableName);
    pullerLambda.addEnvironment('dynamodbTable', promptsTable.tableName);
    
    //
    // Lambda setup - Allow lambda to access Honeycode workbook 
    //
    // (give access to all workbooks)
    //importCustomersLambda.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonHoneycodeWorkbookFullAccess'));
    // (give access to only ONE workbook) - recommended 
    const workbookPolicy = new iam.PolicyStatement();
    workbookPolicy.addActions(['honeycode:ListTables']);
    workbookPolicy.addResources([`arn:aws:honeycode:*:*:workbook:workbook/${environment.workbookId}`]);
    promptsLambda.role.addToPrincipalPolicy(workbookPolicy);
    
    // Table policy for lambda
    const tablePolicy = new iam.PolicyStatement();
    tablePolicy.addActions(['honeycode:ListTableColumns', 'honeycode:BatchCreateTableRows', 
                            'honeycode:BatchUpdateTableRows', 'honeycode:BatchDeleteTableRows', 
                            'honeycode:QueryTableRows']);
    tablePolicy.addResources([`arn:aws:honeycode:*:*:table:workbook/${environment.workbookId}/table/*`]);
    promptsLambda.role.addToPrincipalPolicy(tablePolicy);
   
    //Output the Bucket URL
    new cdk.CfnOutput(scope, "DynamoDB table for Prompts", {
        value: `${promptsTable.tableName}`
    }); 
    
}

module.exports = { exportPromptsToDynamoDB };