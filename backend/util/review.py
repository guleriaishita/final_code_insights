
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


    def generate_review(self, file_content: str, file_type: str, compliance_sections: Dict[str, str], 
                       additional_content: str, model_name: str, provider: str) -> str:
        try:
            if file_type == "source":
                with open(self.design_patterns_path, "r") as patterns_file:
                    design_patterns = patterns_file.read()
                    
                prompt = f"""
    You are a **Code Reviewer Expert**, specializing in creating clear, detailed, and actionable review for configuration files, ensuring high-quality and well-structured output
                
    ### Objective:
    Generate high-quality, comprehensive review for the provided source file. The output must focus on the purpose, structure, comparisons, alternative best solutions ,code smell and many other instructions listed below in very detail .
                
    The code for which you have to create review is provided below with all the review guidelines you have to follow.{file_content}
                
    Follow these user provided review guidelines as user wants review to be generated by focusing on the instruction provided {compliance_sections['review']}
    
        In detail Instructions:
        DETAILED ANALYTICAL REVIEW PROTOCOL 
        I. DESIGN PATTERNS AND ARCHITECTURAL ANALYSIS
        Objective: Comprehensive Design Pattern Mapping and Architectural Evaluation

        Design Patterns Identification use the following instructions also for the referrence you can follow up on the provided design patterns 
        Design patterns referrence:{design_patterns}
        - Systematically cross-reference the provided design patterns with the current source code implementation
        - Detailed Pattern Mapping:
        * Identify explicitly implemented design patterns
        * Specify exact location and implementation method
        * Assess pattern application effectiveness
        * Evaluate architectural coherence

        Unimplemented Design Pattern Recommendations:
        - Analyze code structure to suggest:
        * Most appropriate unimplemented design patterns
        * Specific implementation strategies
        * Potential architectural improvements
        * Performance and maintainability benefits of recommended patterns

        II. ADDITIONAL FILES CONTEXTUAL INTEGRATION
        To follow the additional file context these are the  files provided by the user
        - Additional Files {additional_content}
        Comprehensive Interdependency Analysis:
        - Examine interactions between provided additional files from and primary source code
        - Deep Dive Investigations:
        * Shared dependency mapping
        * Cross-file architectural connections
        * Module interaction patterns
        * Potential refactoring opportunities

        III. CODING STYLE AND NAMING CONVENTION ASSESSMENT
        Naming Convention Evaluation:
        - Systematic Analysis of Naming Practices:
        * Class Naming: Consistency, descriptiveness, semantic clarity
        * Method/Function Naming: Action-driven nomenclature, verb usage, scope clarity
        * Variable Naming: Context-rich, type-indicative naming strategies
        * Constant Naming: Standardization, semantic meaning

        Coding Style Comprehensive Review:
        - Formatting Consistency
        - Indentation and Structural Uniformity
        - Whitespace and Line Break Optimization
        - Adherence to Language-Specific Styling Guidelines

        IV. CODE QUALITY AND PERFORMANCE INSIGHTS
        Technical Depth Analysis:
        - Detailed Functionality Explanation
        - Performance Characteristic Assessment
        - Complexity Metrics Evaluation
        - Optimization Potential Identification
        - Scalability and Future-Proofing Considerations

        V. STRATEGIC IMPROVEMENT RECOMMENDATIONS
        Actionable Enhancement Framework:
        - Prioritized Improvement Suggestions
            * Impact Assessment
            * Implementation Ease
            * Long-Term Maintainability
        - Concrete Refactoring Strategies
        - Best Practices Alignment
        - Performance Optimization Pathways

        Delivery Specifications:
        - Professional, Constructive Tone
        - Code-Specific Reference Points
        - Strategic, Forward-Looking Recommendations
        - Clear, Implementable Guidance

        GENERATE a comprehensive, context-aware review that transforms code analysis into a strategic architectural and quality enhancement roadmap.
        
                """
                
            else:
                
                prompt = f"""
        You are a **Code Reviewer Expert**, specializing in creating clear, detailed, and actionable documentation for configuration files, ensuring high-quality and well-structured output
        ### Objective:
        Generate high-quality, comprehensive review for the provided source file. The output must focus on the purpose, structure, comparisons, alternative best solutions ,code smell and many other instructions listed below in very detail .
                
        The code for which you have to create review is provided below with all the review guidelines you have to follow.{file_content}
                
        Follow these user provided review guidelines as user wants review to be generated by focusing on the instruction provided {compliance_sections['review']}
        Instructions:
    1. **Summarize the Configuration File**:
       - Provide an overview of the configuration file’s purpose, structure, and key settings.
       - Discuss how the file serves as part of the broader system and its essential role.

    2. **Explain Integration with the System**:
       - Describe how the configuration file integrates with the overall system.
       - Reference relevant external files and configurations mentioned in the Additional Files section.

    3. ADDITIONAL FILES CONTEXTUAL INTEGRATION
        To follow the additional file context these are the  files provided by the user
        - Additional Files {additional_content}
        Comprehensive Interdependency Analysis:
        - Examine interactions between provided additional files from and primary source code
        - Deep Dive Investigations:
        * Shared dependency mapping also potential refactoring techniques
    
    4. **Review Adherence to Best Practices**:
       - Examine the code in relation to the provided Review Guidelines.
       - If the code follows best practices, highlight specific examples.
       - If there are deviations from best practices, suggest improvements or alternatives that would bring the code in alignment with the guidelines.

    5. **Clarity, Maintainability, and Organization**:
       - Assess the clarity of the configuration file.
       - Evaluate the maintainability of the file and its organization.
       - Recommend potential structural improvements for better readability and usability.

    6. **Analyze External References**:
       - Examine external references like dependencies and imports from the Additional Files section.
       - Discuss their relevance and integration with the configuration file.

    7. **Identify Potential Issues**:
       - Look for potential issues such as hardcoded data, missing settings, or configuration anomalies.
       - Offer actionable recommendations to resolve these issues and improve the configuration file.

    8. **Enhancement Suggestions**:
       - Suggest potential improvements for flexibility, scalability, and adaptability to meet evolving project needs.
       - Identify any sections that could be enhanced to accommodate future system changes.

    9. **Testing and Validation Strategies**:
       - Recommend strategies for testing the configuration file.
       - Ensure that the configuration file is tested for correctness, compatibility, and real-world use cases.
                """

            response = self.generate_litellm_response(prompt, model_name, provider)
            return response['choices'][0]['message']['content']
        except Exception as e:
            print(f"Error in review generation: {e}")
            return "Review generation failed. Default placeholder."

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
        compliance_sections = self.load_compliance_file(compliance_file_path, model_name, provider)
        additional_content = self.load_additional_files(additional_files)

        results = {}
        
        # Generate requested content types
        if "review" in output_types:
            results["review"] = self.generate_review(
                file_content, file_type, compliance_sections, additional_content, 
                model_name, provider
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


def process_input_data(input_file: str) -> Dict:
    """Read and validate input data from JSON file"""
    with open(input_file, 'r') as f:
        data = json.load(f)
        
    required_fields = ['files_data', 'provider', 'model_name', 'output_types']
    if not all(field in data for field in required_fields):
        raise ValueError(f"Missing required fields: {required_fields}")
        
    return data

def save_output(output_file: str, results: Dict) -> None:
    """Save results to output JSON file"""
    with open(output_file, 'w') as f:
        json.dump({
            'status': 'success',
            'results': results
        }, f)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Input JSON file path')
    parser.add_argument('--output', required=True, help='Output JSON file path')
    args = parser.parse_args()

    try:
        # Initialize review system
        reviewer = CodeReviewSystem()
        
        # Process input data
        input_data = process_input_data(args.input)
        
        # Extract file paths and process each file
        results = {}
        for file_data in input_data['files_data']:
            file_results = reviewer.process_code(
                output_types=input_data['output_types'],
                file_path=file_data['path'],
                provider=input_data['provider'],
                model_name=input_data['model_name'],
                compliance_file_path=input_data.get('compliance_file', {}).get('path'),
                additional_files=[f['path'] for f in input_data.get('additional_files', [])]
            )
            results[file_data['name']] = file_results
            
        # Save results
        save_output(args.output, results)
        
    except Exception as e:
        error_response = {
            'status': 'error',
            'message': str(e)
        }
        with open(args.output, 'w') as f:
            json.dump(error_response, f)
        sys.exit(1)

if __name__ == "__main__":
    main()