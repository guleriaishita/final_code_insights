const AWS = require('aws-sdk');

class DynamoDBHelper {
    constructor(tableName, region = 'ap-south-1') {
        AWS.config.update({ region: region });
        this.dynamoDB = new AWS.DynamoDB.DocumentClient();
        this.tableName = tableName;
    }

    static prettyPrintItems(items, title = "Items") {
        console.log(`\n=== ${title} ===`);
        if (!items || items.length === 0) {
            console.log("No items found.");
            return;
        }

        items.forEach((item, index) => {
            console.log(`\nItem ${index + 1}:`);
            console.log(JSON.stringify(item, null, 2));
        });
        console.log(`\nTotal items: ${items.length}`);
    }

    async putItem(item) {
        try {
            await this.dynamoDB.put({
                TableName: this.tableName,
                Item: item
            }).promise();
            return true;
        } catch (error) {
            console.error('Error putting item:', error.message);
            return false;
        }
    }

    async getItem(key) {
        try {
            const response = await this.dynamoDB.get({
                TableName: this.tableName,
                Key: key
            }).promise();
            console.log(response.Item);
            return response.Item;
        } catch (error) {
            console.error('Error getting item:', error.message);
            return null;
        }
    }

    async deleteItem(key) {
        try {
            await this.dynamoDB.delete({
                TableName: this.tableName,
                Key: key
            }).promise();
            return true;
        } catch (error) {
            console.error('Error deleting item:', error.message);
            return false;
        }
    }

    async queryItems(keyConditionExpression, expressionAttributes) {
        try {
            const response = await this.dynamoDB.query({
                TableName: this.tableName,
                KeyConditionExpression: keyConditionExpression,
                ExpressionAttributeValues: expressionAttributes
            }).promise();
            return response.Items || [];
        } catch (error) {
            console.error('Error querying items:', error.message);
            return [];
        }
    }

    async findItemsByAttribute(attributeName, attributeValue, printResults = true) {
        try {
            const params = {
                TableName: this.tableName,
                FilterExpression: `#attr = :value`,
                ExpressionAttributeNames: {
                    '#attr': attributeName
                },
                ExpressionAttributeValues: {
                    ':value': attributeValue
                }
            };

            let items = [];
            let response;

            do {
                response = await this.dynamoDB.scan(params).promise();
                items.push(...response.Items);
                
                // Set the start key for the next iteration if there are more items
                params.ExclusiveStartKey = response.LastEvaluatedKey;
            } while (response.LastEvaluatedKey);

            if (printResults) {
                this.prettyPrintItems(
                    items, 
                    `Items where ${attributeName} = ${attributeValue}`
                );
            }

            return items;
        } catch (error) {
            console.error('Error scanning items:', error.message);
            return [];
        }
    }
}

module.exports = DynamoDBHelper;