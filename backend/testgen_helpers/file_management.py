# file_management.py
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timezone
import uuid
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FileManagementHelper:
    def __init__(self, table_name: str = 'testgen-test', region: str = 'ap-south-1'):
        """
        Initialize the helper with the given table name and region

        Args:
            table_name: DynamoDB table name
            region: AWS region
        """
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)
        self.s3 = boto3.client('s3', region_name=region)
        self.bucket = 'testgen-bucket'
        self.region = region

    def save_file_to_s3_and_db(self,
                               local_file_path: str,
                               s3_subfolder: str = '',
                               extra_args: dict = None) -> Optional[Dict[str, Any]]:
        """
        Save a local file to S3 and record its metadata in DynamoDB

        Args:
            local_file_path: Path to local file
            s3_subfolder: Subfolder in S3 bucket (optional)
            extra_args: Additional S3 upload arguments

        Returns:
            Optional[Dict]: File metadata if successful, None otherwise
        """
        try:
            # Generate unique ID and metadata
            file_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()
            file_name = os.path.basename(local_file_path)

            # Construct S3 key with subfolder if provided
            s3_key = f"{s3_subfolder}/{file_name}" if s3_subfolder else file_name
            s3_key = s3_key.lstrip('/')  # Remove leading slash if present

            # Upload file to S3
            if extra_args is None:
                extra_args = {}
            self.s3.upload_file(local_file_path, self.bucket, s3_key, ExtraArgs=extra_args)

            # Prepare item for DynamoDB
            item = {
                'id': file_id,
                'local_filepath': local_file_path,
                's3_key': s3_key,
                'filename': file_name,
                'timestamp': timestamp,
                'bucket': self.bucket,
                'type': 'file'
            }

            # Save metadata to DynamoDB
            self.table.put_item(Item=item)

            logger.info(f"Successfully saved file {file_name} to S3 and DynamoDB")
            return item

        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            return None

    def save_text_content_to_s3_and_db(self,
                                       content: str,
                                       filename: str,
                                       s3_subfolder: str = '') -> Optional[Dict[str, Any]]:
        """
        Save text content directly to S3 and record its metadata in DynamoDB

        Args:
            content: Text content to save
            filename: Name for the file in S3
            s3_subfolder: Subfolder in S3 bucket (optional)

        Returns:
            Optional[Dict]: File metadata if successful, None otherwise
        """
        try:
            # Generate unique ID and metadata
            file_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()

            # Construct S3 key with subfolder if provided
            s3_key = f"{s3_subfolder}/{filename}" if s3_subfolder else filename
            s3_key = s3_key.lstrip('/')  # Remove leading slash if present

            # Upload content to S3
            self.s3.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=content.encode('utf-8'),
                ContentType='text/plain'
            )

            # Prepare item for DynamoDB
            item = {
                'id': file_id,
                'local_filepath': 'generated_content',
                's3_key': s3_key,
                'filename': filename,
                'timestamp': timestamp,
                'bucket': self.bucket,
                'type': 'file'
            }

            # Save metadata to DynamoDB
            self.table.put_item(Item=item)

            logger.info(f"Successfully saved content as {filename} to S3 and DynamoDB")
            return item

        except Exception as e:
            logger.error(f"Error saving content: {str(e)}")
            return None

    def get_download_url(self, file_id: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate a presigned download URL for a file using its ID

        Args:
            file_id: UUID of the file
            expiration: URL expiration time in seconds (default 1 hour)

        Returns:
            Optional[str]: Presigned URL if successful, None otherwise
        """
        try:
            # Get file metadata from DynamoDB
            response = self.table.get_item(Key={'id': file_id})
            item = response.get('Item')

            if not item:
                logger.error(f"No file found with ID: {file_id}")
                return None

            # Configure S3 client with proper signature version and endpoint
            s3_client = boto3.client(
                's3',
                region_name=self.region,
                config=Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'},
                    region_name=self.region
                )
            )

            # Generate presigned URL
            url = s3_client.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': item['s3_key']
                },
                ExpiresIn=expiration
            )

            logger.info(f"Generated URL for file {item['filename']}")
            return url

        except Exception as e:
            logger.error(f"Error generating download URL: {str(e)}")
            return None

    def get_file_by_name(self, filename: str) -> List[Dict[str, Any]]:
        """
        Find file metadata by filename

        Args:
            filename: Name of the file to find

        Returns:
            List[Dict]: List of matching file metadata
        """
        try:
            response = self.table.scan(
                FilterExpression='filename = :filename AND #type = :type',
                ExpressionAttributeNames={'#type': 'type'},
                ExpressionAttributeValues={
                    ':filename': filename,
                    ':type': 'file'
                }
            )
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error finding file: {str(e)}")
            return []

    def delete_file(self, file_id: str) -> bool:
        """
        Delete file from both S3 and DynamoDB

        Args:
            file_id: UUID of the file

        Returns:
            bool: True if deletion was successful, False otherwise
        """
        try:
            # Get file metadata from DynamoDB
            response = self.table.get_item(Key={'id': file_id})
            item = response.get('Item')

            if not item:
                logger.error(f"No file found with ID: {file_id}")
                return False

            # Delete from S3
            self.s3.delete_object(Bucket=self.bucket, Key=item['s3_key'])

            # Delete from DynamoDB
            self.table.delete_item(Key={'id': file_id})

            logger.info(f"Successfully deleted file {item['filename']}")
            return True

        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            return False


# Test the functionality if run directly
if __name__ == "__main__":
    # Initialize helper
    helper = FileManagementHelper()

    # Example 1: Save a local file
    file_path = "test.txt"  # Replace with your file path
    metadata = helper.save_file_to_s3_and_db(
        file_path,
        s3_subfolder='documents/2024'
    )

    if metadata:
        # Get download URL using the file ID
        url = helper.get_download_url(metadata['id'])
        print(f"File ID: {metadata['id']}")
        print(f"Download URL: {url}")

    # Example 2: Save generated text content
    content_metadata = helper.save_text_content_to_s3_and_db(
        content="This is some test content",
        filename="generated.txt",
        s3_subfolder='generated/2024'
    )

    if content_metadata:
        content_url = helper.get_download_url(content_metadata['id'])
        print(f"\nGenerated content file ID: {content_metadata['id']}")
        print(f"Download URL: {content_url}")