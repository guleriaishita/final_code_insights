import json
import sys
import logging
import argparse
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
import time
import sys
import os
import json


class CodeReviewSystem:
    def __init__(self):
        load_dotenv()
        self.claude_api_key = os.getenv("CLAUD_API_KEY")
        self.open_api_key = os.getenv("OPENAI_API_KEY")
        self.design_patterns_path = "./design_patterns.txt"




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
        Task: Extract and Structure Guidelines from the Compliance Document
       
        Input Document:
        {self.sanitize_input_content(file_content)}
       
        Please analyze the document and extract guidelines for the following sections. Format your response using the exact structure below:
       
        ##review##
        [Extract all guidelines related to code review, best practices, and quality standards]
        ##
       
        ##documentation##
        [Extract all guidelines related to documentation requirements and standards]
        ##
       
        ##comments##
        [Extract all guidelines related to code comments and inline documentation]
        ##
       
        ##knowledge_graph##
        [Extract all guidelines related to knowledge graph structure and representation]
        ##
       
        If any section is not explicitly covered in the document, provide sensible default guidelines based on industry standards.
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




    def process_code(
        self,
        output_types: List[str],
        file_path: str,
        provider: str,
        model_name: str,
        compliance_file_path: Optional[str] = None,
        additional_files: Optional[List[str]] = None
    ) -> Dict[str, str]:
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
        try:
            if not os.path.isfile(file_path):
                raise FileNotFoundError(f"Source file not found: {file_path}")


            print("Analyzing the file. Please wait...")


            # Load and prepare all necessary content
            with open(file_path, 'r', encoding='utf-8') as file:
                file_content = file.read()
               
            file_type = self.determine_file_type(file_path)
            file_extension = os.path.splitext(file_path)[1].lower()
           
            # Load compliance sections with proper error handling
            try:
                compliance_sections = self.load_compliance_file(compliance_file_path, model_name, provider)
            except Exception as e:
                print(f"Warning: Error loading compliance file: {e}")
                compliance_sections = {
                    'review': 'Default review guidelines.',
                    'documentation': 'Default documentation guidelines.',
                    'comments': 'Default comments guidelines.',
                    'knowledge_graph': 'Default knowledge graph guidelines.'
                }


            # Load additional files with proper error handling
            try:
                additional_content = ""
                if additional_files:
                    for add_file in additional_files:
                        if os.path.exists(add_file):
                            with open(add_file, 'r', encoding='utf-8') as f:
                                additional_content += f.read() + "\n\n"
            except Exception as e:
                print(f"Warning: Error loading additional files: {e}")
                additional_content = ""


            results = {}
           
            # Generate requested content types with error handling
            if "review" in output_types:
                try:
                    results["review"] = self.generate_review(
                        file_content, file_type, compliance_sections,
                        additional_content, model_name, provider
                    )
                except Exception as e:
                    print(f"Error generating review: {e}")
                    results["review"] = f"Error generating review: {str(e)}"
                   
            if "documentation" in output_types:
                try:
                    results["documentation"] = self.generate_documentation(
                        file_content, model_name, provider, compliance_sections,
                        file_extension, file_type
                    )
                except Exception as e:
                    print(f"Error generating documentation: {e}")
                    results["documentation"] = f"Error generating documentation: {str(e)}"
                   
            if "comments" in output_types:
                try:
                    results["comments"] = self.generate_comments_or_docstrings(
                        file_content, model_name, provider, compliance_sections
                    )
                except Exception as e:
                    print(f"Error generating comments: {e}")
                    results["comments"] = f"Error generating comments: {str(e)}"


            return results


        except Exception as e:
            print(f"Error in process_code: {e}")
            raise  # Re-raise the exception to be handled by the caller


    def generate_comments_or_docstrings(self, file_snippet: str, model_name: str, provider: str, compliance_sections: Dict[str, str]) -> str:
        comments_guidelines = compliance_sections.get('comments', 'Default comments guidelines.')
        prompt = f"""
            Source Code:
            {file_snippet}
            Comments Guidelines:
            {comments_guidelines}




            Generate comments and docstrings for the provided source code, strictly adhering to the specified comment guidelines while ensuring all instructions outlined below remain intact.




            Instructions:
            1. Generate detailed and meaningful inline comments or docstrings for every part of the code.
            2. Provide a clear explanation for the purpose and functionality of each function, class, constructor, destructor, interface, and any other code block.
            3. Explain the imports and their relevance to the code.
            4. Clarify any complex logic or operations within the code, breaking it down for better understanding.
            5. For functions and classes, describe their arguments, return values, and any side effects.
            6. Use language-appropriate comment styles, such as docstrings for functions/classes and inline comments for specific code lines.
            7. Prioritize readability and maintainability, ensuring the code's purpose is easily understandable.
            8. Make sure to provide context for the code and explain how different components interact.
        """
        try:
            response = self.generate_litellm_response(prompt, model_name, provider)
            return response['choices'][0]['message']['content']
        except Exception as e:
            print(f"Error in comments generation: {e}")
            return "Comments generation failed. Default placeholder."




    def generate_documentation(self, file_snippet: str, model_name: str, provider: str,
                             compliance_sections: Dict[str, str], file_extension: str, file_type: str) -> str:
        documentation_libraries = {
            ".java": "Javadoc", ".py": "Pydoc", ".js": "JSDoc", ".jsx": "JSDOC",
            ".ts": "Typedoc", ".cpp": "Doxygen", ".c": "Doxygen", ".h": "Doxygen",
            ".rs": "Rustdoc", ".rb": "RDoc", ".kt": "Dokka", ".go": "go doc", ".r": "Roxygen2"
        }
       
        documentation_guidelines = compliance_sections.get('documentation', 'Default documentation guidelines.')
       
        if file_type == "source":
            doc_library = documentation_libraries.get(file_extension, "Generic")
            prompt = f"""
                Source Code:
                {file_snippet}
                Documentation guidelines:
                {documentation_guidelines}




                Generate documentation for the provided source code, strictly adhering to the specified documentation guidelines while ensuring all requirements outlined below remain intact.
               
                Follow these specific requirements:
                1. *Code documentation*: Use {doc_library} conventions and syntax strictly to generate the source code documentation.
                2. Ensure the output is professional, structured, and ready for use in {doc_library}.
                3. *Code Summary*: Provide a comprehensive summary of what the source code does and its purpose.
                4. *Tree Structure*:
                   - Create a hierarchical tree structure of the source code, detailing:
                     - All classes and their contained functions.
                     - Each function with its variables and types.
                     - Include constructors, destructors, and interfaces in the tree.
                5. *Detailed Descriptions*:
                   - Document each class, function, and code block in detail.
                   - For each function:
                     - Explain its purpose.
                     - Describe its parameters (name, type, and purpose).
                     - Include return types and exceptions (if applicable).
                   - For classes and interfaces:
                     - Explain their purpose and relationships (inheritance, interfaces, etc.).
                     - List their methods and properties, explaining their roles.
                """
        else:
            prompt = f"""
                Configuration file:
                {file_snippet}
                Documentation Guidelines:
                {documentation_guidelines}
                Generate documentation for the provided configuration file, strictly adhering to the specified documentation guidelines while ensuring all requirements outlined below remain intact.
                Documentation Requirements:
                1. Explain purpose of configuration file
                2. Detail each configuration option
                3. Provide usage instructions
                """




        try:
            response = self.generate_litellm_response(prompt, model_name, provider)
            return response['choices'][0]['message']['content']
        except Exception as e:
            print(f"Error in documentation generation: {e}")
            return "Documentation generation failed. Default placeholder."


    def generate_review(self, file_content: str, file_type: str, compliance_sections: Dict[str, str],
                    additional_content: str, model_name: str, provider: str) -> str:
        try:
            # Load design patterns with error handling
            design_patterns = ""
            try:
                if hasattr(self, 'design_patterns_path') and os.path.exists(self.design_patterns_path):
                    with open(self.design_patterns_path, "r") as patterns_file:
                        design_patterns = patterns_file.read()
            except Exception as e:
                print(f"Warning: Could not load design patterns file: {e}")
                # Continue without design patterns rather than failing
                design_patterns = "Design patterns file not available."


            if file_type == "source":
                prompt = f"""
                CONTEXTUAL INPUTS:
                - Primary Source Code: {self.sanitize_input_content(file_content)}
                - Compliance Guidelines: {compliance_sections.get('review', 'Default review guidelines')}
                - Additional Files Context: {additional_content if additional_content else 'No additional context provided'}
                - Design Patterns Reference: {design_patterns}


                DETAILED ANALYTICAL REVIEW PROTOCOL


                Generate a comprehensive code review addressing the following areas:


                1. Code Structure and Organization:
                - Overall architecture and design choices
                - File organization and module structure
                - Code readability and maintainability
                - Identification of any code smells or anti-patterns


                2. Design Pattern Analysis:
                - Currently implemented design patterns
                - Recommendations for potential pattern applications
                - Architectural improvements
                - Component relationships


                3. Code Quality Assessment:
                - Naming conventions and consistency
                - Method and class organization
                - Error handling
                - Performance considerations
                - Memory management
                - Resource utilization


                4. Security and Best Practices:
                - Security vulnerabilities
                - Input validation
                - Error handling practices
                - API security (if applicable)
                - Data protection measures


                5. Testing and Maintainability:
                - Test coverage assessment
                - Error handling robustness
                - Documentation completeness
                - Code maintainability score
                - Refactoring opportunities


                6. Specific Recommendations:
                - High-priority improvements
                - Technical debt reduction
                - Performance optimizations
                - Security enhancements
                - Maintainability improvements


                Please provide specific examples and code references where applicable, and ensure all recommendations are actionable and clearly explained.
                """
            else:
                prompt = f"""
                Configuration File Review:


                INPUTS:
                - Configuration Content: {self.sanitize_input_content(file_content)}
                - Review Guidelines: {compliance_sections.get('review', 'Default review guidelines')}
                - Additional Context: {additional_content if additional_content else 'No additional context provided'}


                Please provide a comprehensive review addressing:


                1. Configuration Structure:
                - File organization and format
                - Setting categorization
                - Configuration hierarchy


                2. Security Analysis:
                - Sensitive data handling
                - Environment separation
                - Security best practices


                3. Best Practices:
                - Standard naming conventions
                - Documentation completeness
                - Value formatting and validation


                4. Integration Assessment:
                - Dependencies and relationships
                - System impact
                - Configuration conflicts


                5. Recommendations:
                - Structural improvements
                - Security enhancements
                - Maintainability suggestions
                - Documentation improvements


                Provide specific examples and clear, actionable recommendations.
                """


            # Add error handling for API call
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = self.generate_litellm_response(prompt, model_name, provider)
                    review_content = response['choices'][0]['message']['content']
                   
                    # Validate the response
                    if not review_content or len(review_content.strip()) < 50:  # Minimum content check
                        raise ValueError("Generated review content is too short or empty")
                       
                    return review_content
                   
                except Exception as e:
                    if attempt == max_retries - 1:  # Last attempt
                        raise  # Re-raise the last exception
                    print(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
                    time.sleep(2 ** attempt)  # Exponential backoff
                   
        except Exception as e:
            error_msg = f"Error in review generation: {str(e)}"
            print(error_msg)
            # Return a more informative error message instead of just a placeholder
            return f"""Review generation encountered an error.
            Error details: {error_msg}
           
            This might be due to:
            1. API connection issues
            2. Invalid input format
            3. Server timeout
           
            Please try again or contact support if the issue persists."""






def process_files(files_data, temp_dir):
    """
    Process the uploaded files and create a temporary directory structure
   
    Args:
        files_data (list): List of dictionaries containing file information
        temp_dir (str): Path to temporary directory
    """
    if not files_data:
        return []
   
    file_paths = []
    for file_info in files_data:
        if not isinstance(file_info, dict):
            logging.warning(f"Invalid file info format: {file_info}")
            continue
           
        filename = file_info.get('filename')
        content = file_info.get('content', '')
       
        if not filename:
            logging.warning("Missing filename in file info")
            continue
       
        # Create file path maintaining any directory structure
        file_path = os.path.join(temp_dir, filename)
       
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
       
        # Write file content
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            file_paths.append(file_path)
        except Exception as e:
            logging.error(f"Failed to write file {filename}: {str(e)}")
            continue
   
    return file_paths


def create_temp_compliance_file(compliance_data, temp_dir):
    """
    Create temporary compliance file if provided
   
    Args:
        compliance_data (dict): Dictionary containing compliance file information
        temp_dir (str): Path to temporary directory
    """
    if not compliance_data:
        return None
   
    compliance_path = os.path.join(temp_dir, compliance_data['filename'])
    os.makedirs(os.path.dirname(compliance_path), exist_ok=True)
   
    with open(compliance_path, 'w', encoding='utf-8') as f:
        f.write(compliance_data['content'])
   
    return compliance_path






# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def main():
    parser = argparse.ArgumentParser(description='Process code review')
    parser.add_argument('--input', required=True, help='Input JSON file path')
    parser.add_argument('--output', required=True, help='Output JSON file path')
    args = parser.parse_args()

    try:
        with open(args.input, 'r') as f:
            input_data = json.load(f)
        
        logging.info("Input data successfully parsed")
        
        reviewer = CodeReviewSystem()
        
        output_types = input_data.get('output_types', [])
        if isinstance(output_types, str):
            output_types = [t.strip() for t in output_types.split(",")]
        
        # Create temp directory if it doesn't exist
        temp_dir = input_data.get('temp_dir')
        if not temp_dir:
            temp_dir = '/tmp/codeinsights'
        os.makedirs(temp_dir, exist_ok=True)

        main_files = process_files(input_data.get('files_data', []), temp_dir)
        if not main_files:
            raise ValueError("No valid files to process")

        try:
            results = reviewer.process_code(
                output_types=output_types,
                file_path=main_files[0],
                provider=input_data['provider'],
                model_name=input_data['model_name'],
                compliance_file_path=create_temp_compliance_file(
                    input_data.get('compliance_file_data'), temp_dir
                ),
                additional_files=process_files(
                    input_data.get('additional_files', []), temp_dir
                )
            )
            
            with open(args.output, 'w') as f:
                json.dump({
                    'status': 'success',
                    'results': results
                }, f)
            
            logging.info("Processing completed successfully")
            sys.exit(0)
            
        except Exception as e:
            logging.error(f"Processing error: {str(e)}", exc_info=True)
            with open(args.output, 'w') as f:
                json.dump({
                    'status': 'error',
                    'message': str(e)
                }, f)
            sys.exit(1)
            
    except Exception as e:
        logging.error(f"Fatal error: {str(e)}", exc_info=True)
        with open(args.output, 'w') as f:
            json.dump({
                'status': 'error',
                'message': str(e)
            }, f)
        sys.exit(1)
if __name__ == "__main__":
    main()


