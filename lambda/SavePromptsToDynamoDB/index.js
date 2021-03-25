/*! 
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * This lambda uses the `QueryTableRows` Honeycode APs to read 
 * promppts from Honeycode and save them to DynamoDB table 
 * and then sets the Exported column in Honeycode table to today's 
 * date using the `BatchUpdateRows` Honeycode API
 */
const AWS = require('aws-sdk'); //Requires atleast VERSION 2.7x
const HC = new AWS.Honeycode({ region: 'us-west-2' });
const DDB = new AWS.DynamoDB();


// Read and initialize variables from the lambda environment. 
// The lambda environment is set by CDK using env.json file 
const { workbookId, promptsTableName, promptsGroupsTableName, promptsTranslationsTableName, dynamodbTable } = process.env;

// create a documenet client for writing to DynamoDB
var documentClient = new AWS.DynamoDB.DocumentClient();

// Convert from JSON to CSV
const stringify = require('csv-stringify/lib/sync');

//Alternative stringify implementation to convert from Honeycode rows JSON array to Key:Value JSON format
/*
const stringify = (rows, { columns }) => JSON.stringify(rows.map(row => row.reduce((values, value, i) => {
    values[columns[i].key] = value
    return values
}, {})), null, 2)
*/

function saveToDynamoDB (item)
{
    console.log("SAVETODYNAMO " + JSON.stringify(item));

    var o = {};
    o.MsgGroup = item.msggroup;
    o['Messages'] = {};
    o['Messages']['Situational'] = [];
    o['Messages']['Static'] = [];

    // loop through each message and then each localization
    for(var msg of item.messages) {
        if (msg.type == 'Static') {
            o['Messages']['Static'].push({"MsgId": msg.messageid, "MsgText": msg.translations, 
                                          "CustomerForMonths": msg.custformo, "MsgStart": msg.validstart, 
                                          "MsgEnd": msg.validend});
        }
        if (msg.type == 'Situational'){
            o['Messages']['Situational'].push({"Enabled": true, MsgDetail: {"MsgId": msg.messageid, "MsgText": msg.translations },
                                               "CustomerForMonths": msg.custformo, "MsgStart": msg.validstart, 
                                               "MsgEnd": msg.validend});
        }
    }

    var params = {
      TableName: dynamodbTable,
      Item: o
    };    

    return documentClient.put(params, function(err, data) {
        if (err) console.log(err);
        else console.log(data);
    }).promise();

/*
    var params = {
        TableName: 'dynamodbTable',
        Item: {
            "MsgGroup" : {"S" : rowID, "M" : { "Messages" : { "S": { "Name" : {"S": "Daniel"}}}, "S" {"Age" : {"N" : "44"}} } } }
        }
    };
    
    return DDB.putItem(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data);
        }
    });
*/
    
    //const now = new Date();
    //const Key = `csv/${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}/${now.getTime()}.csv`;
    //const Key = `csv/prompts.csv`;
    //Use json file extension when using alternative stringify implementation to store as json data
    //const Key = `json/${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}/${now.getTime()}.json`
    //return S3.putObject({ Body, Bucket: s3bucket, Key }).promise();
    
};

exports.handler = async () => {
    
    var o = 0;
    
    try {
        
        //Get tables in this workbook
        const { tables } = await HC.listTables({ workbookId }).promise();
        
        //Create a map of table name to table id
        const tableIds = tables.reduce((tables, table) => {
            tables[table.tableName] = table.tableId;
            return tables;
        }, {});
        
        //Get MessageGroup columnIds
        const { tableColumns } = await HC.listTableColumns({
            workbookId, tableId: tableIds[promptsTableName]
        }).promise();
        
        console.log("TABLEIDS0: " + tableIds[promptsTranslationsTableName]);
        
        var messageGroupsList = await getMessageGroups(tableIds);
        
        for (var group of messageGroupsList) 
        {
           
            // retrieve messages and their translations
            group.messages = {};
            group.messages = await getMessagesForGroup(tableIds, group.msggroup);
           
            saveToDynamoDB(group);
            
            o++;
            
        }
        
/*        
        
        
        //Convert to array of column names
        const columns = tableColumns.map(column => ({ key: column.tableColumnName }));
        
        // Identify the Exported column ID (assuming it is newxt to last column)
        const exportedColumnId = tableColumns[tableColumns.length - 2].tableColumnId;
        
        // Filter for, and Loop through the rows where Published column is blank
        let count = 0;
        const today = new Date().toLocaleDateString('en-US'); //M/D/Y format
        let nextToken;
        
        do {
            
            //Get rows that have not been published already
            const results = await HC.queryTableRows({
                workbookId, tableId: tableIds[promptsTableName],
                filterFormula: {
                    formula: `=FILTER(${promptsTableName}, "${promptsTableName}[PublishedDDB] = %","")`
                },
                nextToken
            }).promise()
            
            //Convert json structure for writing to CSV
            const rows = []
            const rowsToUpdate = []
            const colHeads = results.columnIds;
            if (results.rows) {
                var o = {};
                o['Messages'] = {};
                o['Messages']['Situational'] = [];
                o['Messages']['Static'] = [];

                // go through all rows returned
                for (let { cells, rowId } of results.rows) {
                    
                    var osit = {};
                    osit.Enabled = 'true';
                    osit.MsgDetail = {};
                    osit.MsgDetail.MsgId = "sampleMessageID";
                    osit.MsgDetail.MsgText = {};
                    

                    const row = [];
                    
                    // go through the cells of a given row
                    for (let { formattedValue } of cells) {
                        osit.MsgDetail.MsgText['en-US'] = formattedValue;
                        row.push(formattedValue)
                    }
                    
                    o['Messages']['Situational'].push(osit);
                    o['Messages']['Static'].push(osit);
                    o['MsgGroup'] = "daniels-sample-messages";
                    
                    console.log("ROWSTRING: " + JSON.stringify(o));
                    
                    await saveToDynamoDB(o);
                    
                    //Update exported date, assuming this is the last column in the table
                    
                    row.splice(row.length - 2, 1, today)
                    rows.push(row)
                    rowsToUpdate.push({
                        rowId,
                        cellsToUpdate: {
                            [exportedColumnId]: {
                                fact: today
                            }
                        }
                    })
                    
                }
            }
            if (rows.length > 0) {
                //Write to S3
                // await saveToS3(stringify(rows, { header: true, columns }))
                //Update exported date in table
                const { failedBatchItems } = await HC.batchUpdateTableRows({
                    workbookId, tableId: tableIds[promptsTableName], rowsToUpdate
                }).promise()
                if (failedBatchItems) {
                    console.error('Failed to update export date', JSON.stringify(failedBatchItems, null, 2))
                }
                count += rows.length;
            }
            nextToken = results.nextToken;
        } while (nextToken);
        */

        let result;
        if (o) {
            result = `Exported ${o} row(s) of prompts`;
        } else {
            result = `No prompts records to export`;
        }
        return result;
        
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// 
// getMessageGroups - returns MsgGroups that are approved (ie. Approved != "") 
//
// Return: array of {MsgGroupId,MsgGroup} column (aka: Group Name) 
// Param: - none, reads from MessageGroups table
//
var getMessageGroups = async (tableIds) => {
    
    console.log("TABLEIDS1: " + tableIds[promptsGroupsTableName]);
    
    try {
        
        var o = [];
        let nextToken;
        do {
        
            //Get rows that have not been published already
            const results = await HC.queryTableRows(
                { workbookId, 
                  tableId: tableIds[promptsGroupsTableName],
                  filterFormula: {
                    formula: `=FILTER(${promptsGroupsTableName}, "${promptsGroupsTableName}[Status] = %","Live")`
                  },
                  nextToken
            }).promise()
            
            //Convert json structure for writing to CSV
            if (results.rows) {
                
               // go through all rows returned
                for (let { cells, rowId } of results.rows) {
                    
                    var msg = {};
                    msg.msggroupid = rowId;
                    msg.msggroup = cells[0].formattedValue;
                    
                    o.push(msg);
                }
                
            }
            
            nextToken = results.nextToken;
        } while (nextToken);
        
        return o;
        
    } catch (error) {
        console.error(error);
        throw error;
    }
    
};


//
//
//
//
var getMessagesForGroup = async (tableIds,groupId) => 
{

    console.log("TABLEIDS2: GROUP " + tableIds[promptsTableName] + " group " + groupId);

   try {
        
        var o = [];

        let nextToken;
        do {
        
            //Get rows that have not been published already
            const results = await HC.queryTableRows(
                { workbookId, 
                  tableId: tableIds[promptsTableName],
                  filterFormula: {
                    formula: `=FILTER(${promptsTableName}, "${promptsTableName}[GroupId] = %","${groupId}")`
                  },
                  nextToken
            }).promise();
            
            console.log("RESULTS2 " + results.rows.length);
            
            //Convert results into json [ {message {translations}}, ....]
            if (results.rows) {
                
                // go through all Messages rows returned (see Messages table)
                for (let { cells, rowId } of results.rows) {
                    
                    var curColNumber = 0;
                    var row = {};
                    
                /*
                 * Go through every cell and save it
                 * column/cell number - mapped to column name 
                 *
                    0 - MessageId
                    1 - Description
                    2 - GroupId
                    3 - TypePicklist
                    4 - Type
                    5 - ReferenceId
                    6 - ValidStart
                    7 - ValidEnd
                */
                    
                    for (let { formattedValue } of cells) {
                        switch (curColNumber) {
                            case 0: row.messageid    = formattedValue; break;
                            case 4: row.type         = formattedValue; break;
                            case 5: row.custformo    = formattedValue; break;
                            case 6: row.validstart   = formattedValue; break;
                            case 7: row.validend     = formattedValue; break;
                        }
                        
                                                    
                        // push the message into an array for returning
                        curColNumber++;
                    }
                    
                    // Get all translations for this row (based on MessageId rowlink)   
                    row.translations = {};
                    row.translations = await getTranslationsForMessage(tableIds, 
                                                row.messageid);
                    o.push(row);  
                }
            }
            
            nextToken = results.nextToken;
        } while (nextToken);
        
        return o;
        
    } catch (error) {
        console.error(error);
        throw error;
    }
    
};

var getTranslationsForMessage = async (tableIds,messageId) =>
{

    console.log("TABLEIDS3: MSGID " + tableIds[promptsTranslationsTableName] + " messageid " + messageId);
    
   try {
        
        var o = {};

        let nextToken;
        do {
        
            //Get rows that have not been published already
            const results = await HC.queryTableRows(
                { workbookId, 
                  tableId: tableIds[promptsTranslationsTableName],
                  filterFormula: {
                    formula: `=FILTER(${promptsTranslationsTableName}, "${promptsTranslationsTableName}[MessageId] = %","${messageId}")`
                  },
                  nextToken
            }).promise()
            
            console.log("RESULTS3: " + results.rows.length);
            
            //Convert results into json [ {message {translations}}, ....]
            if (results.rows) {
                
                // go through all Messages rows returned (see Messages table)
                //for (let { cells, rowId } of results.rows) {
                //for (let i = 0 ; i < results.rows.length; i++) {
                results.rows.forEach(r => 
                {
                    var cells = r.cells;
                    var rowId = r.rowId;
                    
                    var curColNumber = 0;
                    var row = {};
                    
                /*
                 * Go through every cell and save it
                 * column/cell number - mapped to column name 
                 *
                    0 - MessageId
                    1 - Text
                    2 - Locale
                */
                    
                    // for (let { formattedValue } of cells) {
                    cells.forEach(c => 
                    {
                        switch (curColNumber) {
                            case 1:     row.text         = c.formattedValue; break;
                            case 2:     row.locale       = c.formattedValue; break;
                        }
                        curColNumber++;
                    });
                    o[row.locale] = row.text; 
                });
            }
            
            nextToken = results.nextToken;
        } while (nextToken);
        
        return o;
        
    } catch (error) {
        console.error(error);
        throw error;
    }
    
};
