# test_existing.py
from file_management import FileManagementHelper


def test_existing_file():
    helper = FileManagementHelper()

    # First, let's try to find files by their names
    print("1. Listing existing files...\n")
    files = helper.get_file_by_name('file.txt')

    if not files:
        print("No files found with name 'file.txt'")
        # Let's try with test.txt
        files = helper.get_file_by_name('test.txt')
        if not files:
            print("No files found with name 'test.txt' either")
            return

    # Print all found files
    print(f"Found {len(files)} files:")
    for idx, file in enumerate(files, 1):
        print(f"\nFile {idx}:")
        print(f"ID: {file['id']}")
        print(f"S3 Key: {file['s3_key']}")
        print(f"Upload Time: {file['timestamp']}")

        # Generate URL for each file
        print("\nGenerating download URL...")
        url = helper.get_download_url(file['id'])
        if url:
            print(f"Download URL: {url}")

            # Verify file still exists in S3
            try:
                helper.s3.head_object(
                    Bucket=helper.bucket,
                    Key=file['s3_key']
                )
                print("✓ File verified in S3")
            except Exception as e:
                print(f"Error verifying file: {str(e)}")
        else:
            print("Failed to generate URL")


if __name__ == "__main__":
    test_existing_file()