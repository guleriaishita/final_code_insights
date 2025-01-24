# test_upload.py
from file_management import FileManagementHelper


def test_file_upload():
    helper = FileManagementHelper()

    # Create test content
    with open('test.txt', 'w') as f:
        f.write("Hello World! This is a test file.")

    print("1. Testing file upload...")
    # Upload text file
    metadata = helper.save_file_to_s3_and_db(
        'test.txt',
        s3_subfolder='test'
    )

    if metadata:
        print("\n2. File uploaded successfully:")
        print(f"File ID: {metadata['id']}")
        print(f"S3 Key: {metadata['s3_key']}")

        # Generate URL
        print("\n3. Generating download URL...")
        url = helper.get_download_url(metadata['id'])
        print(f"Download URL: {url}")
        print("\nTry opening this URL in your browser")

        # Also verify file exists in S3
        print("\n4. Verifying file in S3...")
        try:
            helper.s3.head_object(
                Bucket=helper.bucket,
                Key=metadata['s3_key']
            )
            print("✓ File verified in S3")
        except Exception as e:
            print(f"Error verifying file: {str(e)}")


if __name__ == "__main__":
    test_file_upload()