# Amazon Connect + Amazon Honeycode Integration sample

Before we dive into the step by step lab, here is the architecture of the solution.
![Architecture Diagram](media/architecture-diagram.png)

## 0. Overivew and Prerequisites 
This lab should take about 30-60 minutes. The expertise level is: Medium. You will
not have to code, but will need to be able to execute commands on the command line, 
change text files, navigate the AWS console. 

Prerequisites for this lab:
- Amazon Honeycode - where you will instantiate and use a template.
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

## 1. Instantiate Amazon Honeycode Tempalte 

## 2. Deploy the accompanying code

create Cloud9 instance (URL)
wget https://github.com/aws-samples/amazon-honeycode-connect-integration-sample/archive/refs/heads/main.zip
unzip main.zip
rm main.zip 
cd amazon-honeycode-connect-integration-sample-main

edit lambda/env.json
set the workbookId to the ID of the workbook you are using
(get the workbook id from screen)

run these commands in proejct directory
npm install -gf aws-cdk
npm install

cd lambda/SavePromptsToDynamoDB
npm install csv-stringify
npm install 


cd ../..

cdk bootstrap
cdk deploy





## 3. Deploy an Amazon Connect flow 

Step 1: Create an Amazon Connect instance 

Step 2: Grant Amazon Connect permission to execute your AWS Lambda function
Ensure that the Amazon Connect instance has permissions to access this newly created AWS Lambda Function by following these steps.

Select Amazon Connect in the AWS Management Console.
Select your Amazon Connect virtual contact center instance.
Choose Contact flows and scroll down to the AWS Lambda section.
On the Function drop-down menu, select the mlflows-MessageRetrieverLambda function and click on +Add Lambda Function, as shown in the following screenshot:

HoneycodeConnectLabStack-ConnectPullPromptsFromDyn-[IDENTIFIER]

Step 3: Instantiate the new flow
(via import method, from data directory in repo)
log into the conecte console:
https://[INSTANCEID].awsapps.com/connect/home

Go to contact flows
Click create contact flow
Import Flow (in the top right 

Save flow 
Check that the correct function is being invoked 
Check that inMessageGroup is set to: GreetingLanguage

Save flow 


Step 4: add a phone number and associate it with this flow 






## 4. Destroy the lab

cdk destroy


# Try it out

## 5. Test as Susan, the night shift suppervisor

## 6. Test as Call Center Manager 

## 7. Test as the Customer Support Director

## 8. (Optional) Second Region

Amazon Honeycode currently runs in US-WEST-2, but if your Amazon Connect is in a 
different region. You can still use this solution with DynamoDB Global Tables and 
replicate the data to a table in the region where your Amazon Connect runs.


