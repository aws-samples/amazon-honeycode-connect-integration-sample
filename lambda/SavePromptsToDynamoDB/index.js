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

// This function formats the rows retrieved below into something suitable for the
// schema used in DynamoDB and required by the Connect Flow. It converts a flat list
// into a hierarchy under "Static" and "Situational" groups of messages.
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

    
};

// Lambda entry point
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
        
        // Get message groups
        var messageGroupsList = await getMessageGroups(tableIds);
        
        // Loop through message groups
        for (var group of messageGroupsList) 
        {
           
            // retrieve messages and their translations for this message group
            group.messages = {};
            group.messages = await getMessagesForGroup(tableIds, group.msggroup);
           
            // call formatter and writer to DynamoDB
            saveToDynamoDB(group);
            
            o++;
        }
        
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

/*
 *
 * getMessageGroups - returns MsgGroups that are Live
 *
 * Param: - none, reads from MessageGroups table
 * Return: array of {MsgGroupId,MsgGroup} column (aka: Group Name) 
 *
 */
var getMessageGroups = async (tableIds) => {
    
    console.log("TABLEIDS1: " + tableIds[promptsGroupsTableName]);
    
    try {
        
        var o = [];
        let nextToken;
        do {
        
            // Get MessageGroup rows that are marked as Live in Honeycode
            const results = await HC.queryTableRows(
                { workbookId, 
                  tableId: tableIds[promptsGroupsTableName],
                  filterFormula: {
                    formula: `=FILTER(${promptsGroupsTableName}, "${promptsGroupsTableName}[Status] = %","Live")`
                  },
                  nextToken
            }).promise()
            
            // Convert json structure into a record we will later process and save to Dynamo
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


/*
 *
 * getMessagesForGroup - retrieves the messages for this specific group
 *   also makes a call to retrieve the translations for each messageId in this message group.
 *
 * Params 
 *   - tableId = name of the table
 *   - groupId = name of messageGroup for which to find messages
 * Return
 *   - a complete flat (one message id per entry) array of messages with their translations as children
 *         for example [ ...{"EmergencyMessage":{messageId:EmergencyMessage,translations:{}...
 */
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
                    *  0 - MessageId
                    *  1 - Description
                    *  2 - GroupId
                    *  3 - TypePicklist
                    *  4 - Type
                    *  5 - ReferenceId
                    *  6 - ValidStart
                    *  7 - ValidEnd
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

/*
 *
 * getTranslationsForMessage - returns the specific translations for a given MessageID
 *
 * Params:
 *  - tableId - the table name to search for translations in; example "MessageTranslations"
 *  - messageId - the ID of the message for which we get translations; example: "EmergencyMessage"
 * Returns:
 *  - a json that stores locale and string for that locale; example {"en-US":"Due to earthquakes...","en-ES":"Para.."}
 *    these will be added to the messageId above and later be formatted and saved in DynamoDB
 */
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
            
            //Convert results into json {locale: translation, locale: translation, ....}
            if (results.rows) {
                
                // go through all translations rows returned (see Messages table)
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
                    *   0 - MessageId
                    *   1 - Text
                    *   2 - Locale
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

                    // associate locale with text
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
