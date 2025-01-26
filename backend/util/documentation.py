


import litellm

import os
import re

import json
import xml.etree.ElementTree as ET

import magic
from collections import defaultdict
from dotenv import load_dotenv
from typing import List, Optional, Dict, Union
import argparse
class CodeReviewSystem:
    def __init__(self):
        load_dotenv()
        self.claude_api_key = os.getenv("CLAUD_API_KEY")
        self.open_api_key = os.getenv("OPENAI_API_KEY")
        self.design_patterns_path = "/home/ishitaguleria/WORK/final_code_insights/backend/util/design_patterns.txt"

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



    def generate_documentation(self, file_snippet: str, model_name: str, provider: str, 
                             compliance_sections: Dict[str, str], additional_contents: Dict,file_extension: str, file_type: str) -> str:
        documentation_libraries = {
            ".java": "Javadoc", ".py": "Pydoc", ".js": "JSDoc", ".jsx": "JSDOC",
            ".ts": "Typedoc", ".cpp": "Doxygen", ".c": "Doxygen", ".h": "Doxygen",
            ".rs": "Rustdoc", ".rb": "RDoc", ".kt": "Dokka", ".go": "go doc", ".r": "Roxygen2"
        }
        additional_files_info = ""
        if additional_contents:
                additional_files_info = "\nAdditional Files Context:\n"
                for file_path, info in additional_contents.items():
                    additional_files_info += f"\nFile: {file_path}\nContent: {info['content'][:1000]}...\n"
    
        
        documentation_guidelines = compliance_sections.get('documentation', 'Default documentation guidelines.')
        
        if file_type == "source":
            doc_library = documentation_libraries.get(file_extension, "Generic")
            prompt = f"""
               
    You are a professional **Code Documentation Expert** specializing in generating precise, comprehensive, and professional-grade documentation for various programming languages.


        ### Objective:
        Generate high-quality documentation for the provided source code, adhering to specific professional standards and the specified documentation library while ensuring all requirements outlined below remain intact.


        ### Input Details:
        The code for which you have to create documentation is provided below with all the documentation guidelines you have to follow.
        Source Code Snippet:  {file_snippet}
        Documentation Guidelines:Follow these user provided documentation guidelines by focusing on the instruction for documentation provided below
        {documentation_guidelines}



        ### Instructions for Documentation:

        #### **Code Documentation Standards**
        1. Use `{doc_library}` conventions and syntax strictly for generating documentation.
        2. Ensure the output is professional, well-organized, and formatted for direct integration with `{doc_library}`.

        #### **Comprehensive Code Summary**
        3. Provide a high-level summary of the source code's functionality and overall purpose.

        #### **Tree Structure Overview**
        4. Construct a hierarchical tree representation of the code, including:
        - All classes with their contained functions.
        - Each function with its variables, arguments, and data types.
        - Constructors, destructors, and interfaces with relevant details.

        #### **Detailed Component Descriptions**
        5. Document all key elements of the source code:
        - **Functions**:
            - Purpose and role in the code.
            - Parameters (name, type, and purpose).
            - Return types and exceptions, if any.
        - **Classes and Interfaces**:
            - Their purpose and relationships, such as inheritance or interface implementations.
            - List of methods and properties with detailed roles and interactions.

        #### **Output Requirements**
        6. Ensure the documentation:
        - Is structured, clear, and professional.
        - Uses consistent formatting and terminology throughout.
        - Meets the standards of `{doc_library}` documentation conventions.
                """
        else:
            prompt = f"""
        You are a professional **Configuration Documentation Specialist**, skilled in creating clear, detailed, and actionable documentation specifically tailored for configuration files.

        ---

        ### Objective:
        Generate high-quality, comprehensive documentation for the provided configuration file. The output must focus on the purpose, structure, and usage of the configuration file and emphasize its critical role in managing application settings.

        ---

        Input Details:
        The code for which you have to create documentation is provided below with all the documentation guidelines you have to follow.{file_snippet}
        - Documentation Guidelines:Follow these user provided documentation guidelines by focusing on the instruction for documentation provided below
        {documentation_guidelines}

        ---

        ### Instructions for Documentation:

        #### **Purpose of Configuration Files**
        1. Provide a detailed explanation of the purpose of the configuration file:
        - Describe its role in controlling application behavior or settings.
        - Highlight how it differs from source code by focusing on its declarative nature and emphasis on externalizing configuration logic.

        #### **Detailed Breakdown of Configuration Options**
        2. Document each configuration option comprehensively:
        - Name and describe each configuration option.
        - Specify the data type, default value (if applicable), and valid ranges or options.
        - Explain the purpose of each setting and its impact on the application.
        - Clarify interdependencies between configuration options, if any.

        #### **Usage Instructions**
        3. Include practical usage instructions:
        - Provide examples of how to modify the configuration file to achieve specific goals.
        - Explain how the configuration file interacts with the source code and runtime environment.
        - Detail steps to validate or troubleshoot the configuration file.

        #### **Professional Presentation**
        4. Ensure the documentation is professional and user-friendly:
        - Use consistent formatting and structured sections to enhance readability.
        - Employ concise and clear language to explain technical details effectively.
        - Use bullet points, tables, or code blocks as needed for better presentation.

"""

        try:
            response = self.generate_litellm_response(prompt, model_name, provider)
            return response['choices'][0]['message']['content']
        except Exception as e:
            print(f"Error in documentation generation: {e}")
            return "Documentation generation failed. Default placeholder."



    def process_code(reviewer, output_types, file_path, provider, model_name, compliance_file_path=None, additional_files=None):
        try:
            print(f"Processing file: {file_path}")
            print(f"File exists: {os.path.exists(file_path)}")
            print(f"File contents: {open(file_path, 'r').read()[:100] if os.path.exists(file_path) else 'File not found'}")
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Source file not found: {file_path}")
                
            with open(file_path, 'r', encoding='utf-8') as file:
                file_content = file.read()
                
            file_type = reviewer.determine_file_type(file_path)
            file_extension = os.path.splitext(file_path)[1].lower()
            
            print(f"File type: {file_type}")
            print(f"File extension: {file_extension}")
            
            print(f"Loading compliance file: {compliance_file_path}")
            compliance_sections = reviewer.load_compliance_file(
                compliance_file_path, 
                model_name, 
                provider
            )
            print("Compliance sections loaded:", compliance_sections.keys())
            additional_contents = {}
            if additional_files:
                print(f"Processing {len(additional_files)} additional files...")
                for add_file in additional_files:
                    if not os.path.exists(add_file):
                        print(f"Warning: Additional file not found: {add_file}")
                        continue
                    
                    try:
                        with open(add_file, 'r', encoding='utf-8') as f:
                            additional_contents[add_file] = {
                                'content': f.read(),
                                'type': reviewer.determine_file_type(add_file),
                                'extension': os.path.splitext(add_file)[1].lower()
                            }
                    except Exception as e:
                        print(f"Warning: Error reading additional file {add_file}: {str(e)}")
                        continue

            results = {}
            if "documentation" in output_types:
                print("Generating documentation...")
                results["documentation"] = reviewer.generate_documentation(
                    file_content, 
                    model_name, 
                    provider,
                    compliance_sections,
                    additional_contents,
                    file_extension,
                    file_type
                )
                print("Documentation generated successfully")
            
            return {"status": "success", "results": results}
            
        except Exception as e:
            import traceback
            print(f"Error in process_code: {str(e)}")
            print("Traceback:", traceback.format_exc())
            return {"status": "error", "message": str(e)}

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
                output_types = ["documentation"]
                
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
            json.dump({"status": "success", "documentation": results}, f, indent=2)
            
    except Exception as e:
        # Handle any top-level exceptions
        with open(args.output, 'w') as f:
            json.dump({"status": "error", "message": str(e)}, f)
        sys.exit(1)

if __name__ == "__main__":
    main()