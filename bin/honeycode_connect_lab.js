#!/usr/bin/env node

//
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//

// This is used by node to setup the CDK environment

const cdk = require('@aws-cdk/core');
const { HoneycodeConnectLabStack } = require('../lib/honeycode_connect_lab-stack');

const app = new cdk.App();

// Change HoneycodeConnectLab to something more personal/unique if you want to 
// run multiple stacks in the same account. 
// For example: // DanielHoneycodeConnectLab, or FirstHoneycodeConnectLab
// Make change before doing cdk bootstrap and cdk deploy. If you make this change after
// the stack is running CDK will not know how to destroy the stack, and you will need
// to change this back to the original name of the stack.
new HoneycodeConnectLabStack(app, 'HoneycodeConnectLab');
