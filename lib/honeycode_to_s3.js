/*! 
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
const cdk = require('@aws-cdk/core');
const lambda = require('@aws-cdk/aws-lambda');
const events = require('@aws-cdk/aws-events');
const targets = require('@aws-cdk/aws-events-targets');
const iam = require('@aws-cdk/aws-iam');
const s3 = require('@aws-cdk/aws-s3');
const { AwsCustomResource, AwsCustomResourcePolicy } = require('@aws-cdk/custom-resources');

const environment = require('../lambda/env.json');

function exportPromptsToS3(scope) {
    //Setup S3 bucket where promots will be dropped into
    const promptsRecordsBucket = new s3.Bucket(scope, 'PromptsRecords', {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true
    });
    //Setup export PromtsToS3 Lambda function
    const promptsToS3 = new lambda.Function(scope, 'SavePromptsToS3', {
        description: 'Writes Prompts to S3 Bucket',
        code: lambda.Code.fromAsset('lambda/SavePromptsToS3'),
        handler: 'index.handler',
        runtime: lambda.Runtime.NODEJS_12_X,
        environment,
        timeout: cdk.Duration.minutes(1), //Give enough time for batch upserts
    });
    // Run ExportContactHistory every minute
    const promptsToS3Rule = new events.Rule(scope, 'PromptsToS3Rule', {
        schedule: events.Schedule.expression('rate(1 minute)')
    });
    promptsToS3Rule.addTarget(new targets.LambdaFunction(promptsToS3));
    // Allow lambda function to write to the S3 bucket
    promptsRecordsBucket.grantWrite(promptsToS3);
    // Add the bucket name to the lambda's environment variables
    promptsToS3.addEnvironment('s3bucket', promptsRecordsBucket.bucketName);

    //
    // Allow lambda to access Honeycode workbook
    //
    // (all workbooks option)
    //exportContactHistory.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonHoneycodeWorkbookFullAccess'));
    // (specific workbooks only option) - recommended
    
    // Create workbook policy to allow lambda to list tables
    const workbookPolicy = new iam.PolicyStatement();
    workbookPolicy.addActions(['honeycode:ListTables']);
    workbookPolicy.addResources([`arn:aws:honeycode:*:*:workbook:workbook/${environment.workbookId}`]);
    promptsToS3.role.addToPrincipalPolicy(workbookPolicy);
    
    // Create table policy to allow lambda to read tables
    const tablePolicy = new iam.PolicyStatement();
    tablePolicy.addActions(['honeycode:ListTableColumns', 'honeycode:BatchUpdateTableRows', 'honeycode:QueryTableRows']);
    tablePolicy.addResources([`arn:aws:honeycode:*:*:table:workbook/${environment.workbookId}/table/*`]);
    promptsToS3.role.addToPrincipalPolicy(tablePolicy);
    
    // Write s3-manifest.json to S3 bucket
    new AwsCustomResource(scope, 'S3Manifest', {
        onCreate: {
            service: 'S3',
            action: 'putObject',
            parameters: {
                Bucket: promptsRecordsBucket.bucketName,
                Key: 'manifest.json',
                Body: JSON.stringify({
                    fileLocations: [
                        {
                            URIPrefixes: [
                                `s3://${promptsRecordsBucket.bucketName}/csv/`
                            ]
                        }
                    ]
                }, null, 2)
            },
            physicalResourceId: 'S3ManifestFile'
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
            resources: [`${promptsRecordsBucket.bucketArn}/*`]
        })
    });
    
    //Output the Bucket URL
    new cdk.CfnOutput(scope, "S3 manifest file URL", {
        value: `s3://${promptsRecordsBucket.bucketName}/manifest.json`
    });
}

module.exports = { exportPromptsToS3 };
