import boto3
from botocore.exceptions import ClientError
from typing import Dict, Any, List, Optional
import logging
import json

logger = logging.getLogger(__name__)


class DynamoDBHelper:
    def __init__(self, table_name: str, region: str = 'ap-south-1'):
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)

    @staticmethod
    def pretty_print_items(items: List[Dict[str, Any]], title: str = "Items"):
        """
        Pretty print a list of items

        Args:
            items: List of items to print
            title: Optional title for the output
        """
        print(f"\n=== {title} ===")
        if not items:
            print("No items found.")
            return

        for i, item in enumerate(items, 1):
            print(f"\nItem {i}:")
            print(json.dumps(item, indent=2))
        print(f"\nTotal items: {len(items)}")

    def put_item(self, item: Dict[str, Any]) -> bool:
        """
        Insert or update an item in DynamoDB table

        Args:
            item: Dictionary containing item attributes

        Returns:
            bool: True if operation was successful, False otherwise
        """
        try:
            self.table.put_item(Item=item)
            return True
        except ClientError as e:
            logger.error(f"Error putting item: {e.response['Error']['Message']}")
            return False

    def get_item(self, key: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Retrieve an item from DynamoDB table

        Args:
            key: Dictionary containing primary key attributes

        Returns:
            Optional[Dict]: Item if found, None otherwise
        """
        try:
            response = self.table.get_item(Key=key)
            print(response.get('Item'))
            return response.get('Item')
        except ClientError as e:
            logger.error(f"Error getting item: {e.response['Error']['Message']}")
            return None

    def delete_item(self, key: Dict[str, Any]) -> bool:
        """
        Delete an item from DynamoDB table

        Args:
            key: Dictionary containing primary key attributes

        Returns:
            bool: True if operation was successful, False otherwise
        """
        try:
            self.table.delete_item(Key=key)
            return True
        except ClientError as e:
            logger.error(f"Error deleting item: {e.response['Error']['Message']}")
            return False

    def query_items(self, key_condition_expression: str,
                    expression_attributes: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Query items from DynamoDB table

        Args:
            key_condition_expression: Key condition expression for query
            expression_attributes: Dictionary of expression attribute values

        Returns:
            List[Dict]: List of items matching the query
        """
        try:
            response = self.table.query(
                KeyConditionExpression=key_condition_expression,
                ExpressionAttributeValues=expression_attributes
            )
            return response.get('Items', [])
        except ClientError as e:
            logger.error(f"Error querying items: {e.response['Error']['Message']}")
            return []

    def find_items_by_attribute(self, attribute_name: str, attribute_value: Any, print_results: bool = True) -> List[
        Dict[str, Any]]:
        """
        Find all items that contain a specific attribute with a specific value

        Args:
            attribute_name: Name of the attribute to search for
            attribute_value: Value of the attribute to match
            print_results: Whether to print the results

        Returns:
            List[Dict]: List of items containing the specified attribute value
        """
        try:
            # Create the filter expression and attribute values
            filter_expression = f"#{attribute_name} = :{attribute_name}"
            expression_attr_names = {f"#{attribute_name}": attribute_name}
            expression_attr_values = {f":{attribute_name}": attribute_value}

            # Scan the table with the filter
            response = self.table.scan(
                FilterExpression=filter_expression,
                ExpressionAttributeNames=expression_attr_names,
                ExpressionAttributeValues=expression_attr_values
            )

            items = response.get('Items', [])

            # Handle pagination if there are more items
            while 'LastEvaluatedKey' in response:
                response = self.table.scan(
                    FilterExpression=filter_expression,
                    ExpressionAttributeNames=expression_attr_names,
                    ExpressionAttributeValues=expression_attr_values,
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response.get('Items', []))

            if print_results:
                self.pretty_print_items(items, f"Items where {attribute_name} = {attribute_value}")
            return items
        except ClientError as e:
            logger.error(f"Error scanning items: {e.response['Error']['Message']}")
            return []


# Usage example:
if __name__ == "__main__":
    # Initialize helper
    db_helper = DynamoDBHelper('testgen-test')

    # Example item
    item = {
        'id': 'user#123',
        'sk': 'profile',
        'status': 'active',
        'email': 'john@example.com'
    }
    # Get item
    #     retrieved_item = db_helper.get_item({'id': 'user#123'})

    # Put item
    # db_helper.put_item(item)

    # Query DB by attritbute (eg status)
    active_users = db_helper.find_items_by_attribute('status', 'active')