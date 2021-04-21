# Amazon Connect + Amazon Honeycode Integration sample

Before we dive into the step-by-step lab, here is the architecture of the solution.
![Architecture Diagram](media/architecture-diagram.png)

## Overview and Prerequisites
This lab should take about 30-60 minutes. The expertise level is: Medium. You will
not have to code, but will need to be able to execute commands on the command line,
change text files, navigate the AWS console.

Prerequisites for this lab:
- Amazon Honeycode account - If you don’t have one already, [create a new Honeycode account](https://www.honeycode.aws) and login to your Honeycode account. To get started with Honeycode API you need to [link your Honeycode team with your AWS Account](https://honeycodecommunity.aws/t/connecting-honeycode-to-an-aws-account/98)
- Amazon Connect - where you will import a new Contact flow and claim a phone number
  to test the integration.
- AWS Cloud9 IDE - where you will download this repository and execute a few CDK
  commands. These commands will automatically setup all the necessary Lambda
  functions, DynamoDB table, and permissions.
- AWS Console - where you will be looking at DynamoDB tables, set permissions for
  Connect to access Lambda functions.
- Permissions - you will need Developer level permissions, specifically to setup
  the above services.

Cost of this lab:
- This lab will cost a few cents to run. The costs will be in AWS Lambda function
  executions, and several calls (charged by the minute) to the Amazon Connect.
- To avoid un-expected charges, please destroy this lab when you are done, and do not
  give access or the phone number (used in this lab) to anybody else.

## Instantiate Amazon Honeycode Template

1. Create a new Workbook using the Connect Manager template

![Connect Manager Template](media/create-workbook-from-template.gif)
2. Open Builder > **Call Center Manager** app, right click on any screen, click on **Get ARN and IDs**, and copy the **Workbook ID.** For help with this step refer to the [Getting started with APIs](https://honeycodecommunity.aws/t/getting-started-with-honeycode-apis/790#accessing-arn-and-ids) article in Honeycode Community

> *Note: If you are part of multiple teams in Honeycode, make sure to create the Workbook in the team which is linked to your AWS account*.

## Deploy the accompanying code

1. Create/Open a [AWS Cloud9](https://aws.amazon.com/cloud9/) IDE instance. This may take a few minutes to complete. I recommend the following configuration for this lab:
    * Name: Honeycode API Lab
    * Environment type: Create a new EC2 instance for environment (direct access)
    * Instance type: t2.micro (1 GiB RAM + 1 vCPU)
    * Platform: Amazon Linux 2 (recommended)
    * Cost-saving setting: After 30 minutes (default)
> Note: If you’d like to use your own machine for deploying the API application, you can do so by following the instructions to [install and configure AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites)
2. Download the source package by running the following commands on the Cloud9 terminal
```
git clone https://github.com/aws-samples/amazon-honeycode-connect-integration-sample.git
cd amazon-honeycode-connect-integration-sample
```
> Note: Open **bin/honeycode_connect_lab.js** to view the name of the stack and rename the stack from **HoneycodeConnectLabStack** to say **JohnHoneycodeConnectLab** by adding your first name so it is easier to identify the resources that you create
3. Open **lambda/env.json and update the **workbookId** with the value copied from your *Connect Manager* Honeycode app
    * **lambda/env.json**
4. Run the following commands to start the deployment. This will take a few minutes to complete.
```
npm install -gf aws-cdk
npm install
cdk bootstrap
cdk deploy
```
> Note: Running cdk deploy will do the following
>    * Create the DynamoDB table, and S3 buckets
>    * Create the Lambda functions
>    * Create the event source (DynamoDB, S3 or Event Timer) for the Lambda functions
>    * Add permissions for the Lambda to access Honeycode
>    * Initialize the content in DynamoDB table, S3 bucket

## Deploy an Amazon Connect flow

1. Create an Amazon Connect instance
Follow the instructions here: https://ai-services.go-aws.com/40_connect-transcribe/20_connect.html (up to and including claim a phone number)

2. Grant Amazon Connect permission to execute your AWS Lambda function
Ensure that the Amazon Connect instance has permissions to access this newly created AWS Lambda Function by following these steps.

Select Amazon Connect in the AWS Management Console.
Select your Amazon Connect virtual contact center instance.
Choose Contact flows and scroll down to the AWS Lambda section.
On the Function drop-down menu, select the ConnectPullPromptsFromDyn function and click on +Add Lambda Function, as shown in the following screenshot:

HoneycodeConnectLabStack-ConnectPullPromptsFromDyn-[IDENTIFIER]

3. Instantiate the new flow
(via import method, from data directory in repo)
log into the Connect console:
https://[INSTANCEID].awsapps.com/connect/home

Go to contact flows
Click create contact flow
Import Flow (in the top right

Save flow
Check that the correct function is being invoked
Check that inMessageGroup is set to: GreetingLanguage

Save flow


4. add a phone number and associate it with this flow

## Try it out

### Test as Susan, the night shift supervisor

### Test as Call Center Manager

### Test as the Customer Support Director

## (Optional) Second Region

Amazon Honeycode currently runs in US-WEST-2, but if your Amazon Connect is in a
different region. You can still use this solution with DynamoDB Global Tables and
replicate the data to a table in the region where your Amazon Connect runs.

## Cleanup

1. Remove the Serverless API application by running the following command in your Cloud9 IDE
```
cdk destroy
```
2. Delete the Cloud9 IDE by opening the [Cloud9 console](https://us-west-2.console.aws.amazon.com/cloud9/home?region=us-west-2) and clicking on Delete
