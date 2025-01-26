


import litellm
import yaml
import os
import re
import javalang
import json
import xml.etree.ElementTree as ET
import esprima
import ast
import pycparser
import magic
from collections import defaultdict
from dotenv import load_dotenv
from typing import List, Optional, Dict, Union

class CodeReviewSystem:
    def __init__(self):
        load_dotenv()
        self.claude_api_key = os.getenv("CLAUD_API_KEY")
        self.open_api_key = os.getenv("OPENAI_API_KEY")
        self.design_patterns_path = "../design_patterns.txt"

    def detect_file_type(self, file_path: str) -> Optional[str]:
        try:
            mime = magic.Magic(mime=True)
            return mime.from_file(file_path)
        except Exception as e:
            print(f"Error detecting file type: {e}")
            return None

    def determine_file_type(self, file_path: str) -> str:
        file_extension = os.path.splitext(file_path)[1].lower()
        config_extensions = {".yaml", ".yml", ".json", ".env", ".toml", ".ini", ".cfg"}
        return "config" if file_extension in config_extensions else "source"

    def sanitize_input_content(self, content: str) -> str:
        max_content_length = 100000
        if len(content) > max_content_length:
            print(f"Content truncated to {max_content_length} characters")
            return content[:max_content_length]
        return content

    def generate_litellm_response(self, prompt: str, model_name: str, provider: str) -> dict:
        if provider.lower() == "openai":
            return litellm.completion(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                # max_tokens=3000,
                seed=42,
                top_p=0.95,
                api_key=self.open_api_key
            )
        elif provider.lower() == "anthropic":
            return litellm.completion(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                seed=42,
                top_p=0.85,
                api_key=self.claude_api_key
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def ai_extract_compliance_sections(self, file_content: str, model_name: str, provider: str) -> Dict[str, str]:
        prompt = f"""
        You are an AI expert specializing in compliance document analysis and extracting structured guidelines. Your task is to analyze the provided compliance document and extract guidelines for specific categories, adhering to the following structured approach.

        ### **Task Objective:**
        - Extract and structure guidelines based on the input compliance document.
        - For any section not explicitly covered, provide **default guidelines based on industry standards**.
        - Format your response using the defined structure for clarity and organization.
        
        
        Input Document:
        The document content is sanitized and provided for analysis. Use the below provided relevant content to extract guidelines .
        {self.sanitize_input_content(file_content)}
        
        Please analyze the document and extract guidelines for the following sections. Format your response using the exact structure below:
        
        ##review##
        [- Include all guidelines related to:
            - Code review practices
            - Quality assurance standards
            - Peer review protocols]
        ##
        
        ##documentation##
        [- Cover standards for:
            - Documentation requirements
            - Format and structure of documentation
            - Maintenance of comprehensive records]
        ##
        
        ##comments##
        [- Extract details related to:
            - Inline code comments
            - Standards for descriptive comments
            - Best practices for maintaining clarity and conciseness]
        ##
        
        ##knowledge_graph##
        [- Provide extracted or default guidelines on:
            - Knowledge graph structure and hierarchy
            - Representation of relationships and nodes
            - Compliance with contextual standards]
        ##
        
        If any section is not explicitly covered in the provided input document, provide sensible default guidelines based on industry standards to ensure completeness.
        """
        
        try:
            response = self.generate_litellm_response(prompt, model_name, provider)
            extracted_content = response['choices'][0]['message']['content']
            
            sections = {
                'review': 'Default review guidelines.',
                'documentation': 'Default documentation guidelines.',
                'comments': 'Default comments guidelines.',
                'knowledge_graph': 'Default knowledge graph guidelines.'
            }
            
            patterns = {
                'review': r'##review##\s*(.*?)\s*##',
                'documentation': r'##documentation##\s*(.*?)\s*##',
                'comments': r'##comments##\s*(.*?)\s*##',
                'knowledge_graph': r'##knowledge_graph##\s*(.*?)\s*##'
            }
            
            for section, pattern in patterns.items():
                match = re.search(pattern, extracted_content, re.DOTALL)
                if match and match.group(1).strip():
                    sections[section] = match.group(1).strip()
            
            return sections
            
        except Exception as e:
            print(f"Error extracting compliance sections: {e}")
            return {
                'review': 'Error occurred. Using default review guidelines.',
                'documentation': 'Error occurred. Using default documentation guidelines.',
                'comments': 'Error occurred. Using default comments guidelines.',
                'knowledge_graph': 'Error occurred. Using default knowledge graph guidelines.'
            }

    def load_compliance_file(self, compliance_file_path: Optional[str], model_name: str, provider: str) -> Dict[str, str]:
        default_sections = {
            "review": "Default review guidelines.",
            "documentation": "Default documentation guidelines.",
            "comments": "Default comments guidelines.",
            "knowledge_graph": "Default Knowledge graph"
        }
        
        if not compliance_file_path or not os.path.exists(compliance_file_path):
            return default_sections
            
        try:
            with open(compliance_file_path, "r", encoding='utf-8') as file:
                content = file.read()
                
            if not content.strip():
                return default_sections
                
            extracted_sections = self.ai_extract_compliance_sections(
                content, model_name, provider
            )
            
            for section in default_sections:
                if not extracted_sections[section]:
                    extracted_sections[section] = default_sections[section]
                    
            return extracted_sections
            
        except Exception as e:
            print(f"Error processing compliance file: {e}")
            return default_sections

    def load_additional_files(self, file_paths: Optional[List[str]]) -> str:
        if not file_paths:
            return ""
            
        combined_content = ""
        for file_path in file_paths:
            if os.path.exists(file_path):
                with open(file_path, 'r') as file:
                    combined_content += file.read() + "\n\n"
                print(f"Successfully loaded additional file: {file_path}")
            else:
                print(f"Warning: File {file_path} not found. Skipping it.")
        return combined_content

    def generate_comments_or_docstrings(self, file_snippet: str, model_name: str, provider: str, compliance_sections: Dict[str, str]) -> str:
        comments_guidelines = compliance_sections.get('comments', 'Default comments guidelines.')
        prompt = f"""
        You are an AI specialized in generating comments and docstrings for source code. Your task is to create detailed and meaningful comments for the provided code while adhering strictly to the given guidelines
           
        

    Generate comments and docstrings for the provided source code, strictly adhering to the specified comment guidelines while ensuring all instructions outlined below remain intact.

        ### **Input Provided:**
        - **Source Code:** The relevant code snippet is provided for analysis and creating comments for .
            Source Code:{file_snippet}
        - **Comment Guidelines:** A set of guidelines to ensure consistency and adherence to comments creating standards.
            Comments Guidelines:{comments_guidelines}

        ### **Instructions for Generating Comments and Docstrings:**
        1. **Detailed Inline Comments and Docstrings:**  
        - Add meaningful inline comments and docstrings for every part of the code.
        - Ensure each comment provides clarity on the purpose and functionality.

        2. **Explanation of Functions and Classes:**  
        - Describe the purpose and role of each function, class, constructor, destructor, interface, and other code blocks.
        - Provide context on how these components interact.

        3. **Relevance of Imports:**  
        - Explain the imports and their necessity in the code.

        4. **Clarification of Complex Logic:**  
        - Break down complex logic or operations for easier understanding.

        5. **Arguments, Return Values, and Side Effects:**  
        - For functions and classes, describe their:
        - Arguments and their types.
        - Return values and their significance.
        - Any side effects or dependencies.

        6. **Language-Appropriate Styles:**  
        - Use docstrings for functions and classes.
        - Apply inline comments for specific code lines and logic.

        7. **Readability and Maintainability:**  
        - Prioritize comments that enhance readability and make the code easily understandable for future developers.

        8. **Contextual Interactions:**  
        - Explain how various components of the code interact and their significance.

        ### **Output Requirements:**
        - Use language-specific commenting styles.
        - Maintain a structured format for comments and docstrings.
        - Ensure clarity, precision, and adherence to the guidelines provided.
        """
        try:
            response = self.generate_litellm_response(prompt, model_name, provider)
            return response['choices'][0]['message']['content']
        except Exception as e:
            print(f"Error in comments generation: {e}")
            return "Comments generation failed. Default placeholder."

    

    

    def process_code(self, 
                    output_types: List[str],
                    file_path: str,
                    provider: str,
                    model_name: str,
                    compliance_file_path: Optional[str] = None,
                    additional_files: Optional[List[str]] = None) -> Dict[str, str]:
        """
        Process code based on selected output types and return generated content
        
        Args:
            output_types: List of desired outputs ("review", "documentation", "comments")
            file_path: Path to the main source file
            provider: AI provider name
            model_name: AI model name
            compliance_file_path: Optional path to compliance guidelines file
            additional_files: Optional list of additional file paths
            
        Returns:
            Dictionary mapping output types to generated content
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Source file not found: {file_path}")

        print("Analyzing the file. Please wait...")

        # Load and prepare all necessary content
        with open(file_path, 'r') as file:
            file_content = file.read()
            
        file_type = self.determine_file_type(file_path)
        file_extension = os.path.splitext(file_path)[1].lower()
        compliance_sections = self.load_compliance_file(compliance_file_path, model_name, provider)
        additional_content = self.load_additional_files(additional_files)

        results = {}
        
            
        if "comments" in output_types:
            results["comments"] = self.generate_comments_or_docstrings(
                file_content, model_name, provider, compliance_sections
            )

        # Save results to files
        for output_type, content in results.items():
            output_file = f"{output_type}_file.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"Generated {output_type.capitalize()}:\n")
                f.write(content)
                print(f"Generated {output_type} saved to {output_file}")
                
        print("Analysis complete. Results saved successfully.")
        return results


import json
import sys
import argparse


def process_input_data(input_data: Dict) -> Dict:
    required_fields = ['files_data', 'provider', 'model_name', 'output_types']
    if not all(field in input_data for field in required_fields):
        raise ValueError(f"Missing required fields: {required_fields}")
    return input_data

def save_output(output_file: str, results: Dict) -> None:
    with open(output_file, 'w') as f:
        json.dump({
            'status': 'success',
            'results': results
        }, f)
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--compliance', default=None)
    parser.add_argument('--additional-files', nargs='*', default=None)
    args = parser.parse_args()

    try:
        output_dir = os.path.dirname(args.output)
        os.makedirs(output_dir, exist_ok=True)
        
        with open(args.input, 'r') as f:
            input_data = json.load(f)
            
        reviewer = CodeReviewSystem()
        results = {}
        
        for file_data in input_data['files_data']:
            try:
                # Prepare output types (in this case, just documentation)
                output_types = ["comments"]
                
                # Call process_code with the correct parameters
                result = reviewer.process_code(
                    output_types=output_types,
                    file_path=file_data['path'],
                    provider=input_data['provider'],
                    model_name=input_data['model_name'],
                    compliance_file_path=args.compliance,
                    additional_files=args.additional_files
                )
                
                # Store results
                results[file_data['name']] = result
            except Exception as e:
                results[file_data['name']] = {"status": "error", "message": str(e)}
        
        # Write output to file
        with open(args.output, 'w') as f:
            json.dump({"status": "success", "comments": results}, f, indent=2)
            
    except Exception as e:
        # Handle any top-level exceptions
        with open(args.output, 'w') as f:
            json.dump({"status": "error", "message": str(e)}, f)
        sys.exit(1)

if __name__ == "__main__":
    main()