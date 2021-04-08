#!/usr/bin/env node

// 
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//

// This is used by node to setup the CDK environment

const cdk = require('@aws-cdk/core');
const { HoneycodeConnectLabStack } = require('../lib/honeycode_connect_lab-stack');

const app = new cdk.App();
new HoneycodeConnectLabStack(app, 'HoneycodeConnectLabStack');
