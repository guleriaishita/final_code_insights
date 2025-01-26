import litellm
import os
import re
from collections import defaultdict
from dotenv import load_dotenv
import sys
import json
from typing import Dict, List, Union

# Load environment variables hey need to commit.
load_dotenv()
claude_api_key = os.getenv("CLAUD_API_KEY")
open_api_key = os.getenv("OPENAI_API_KEY")

def generate_litellm_response(prompt, model_name, provider):
    """Generate AI response using specified model and provider"""
    if provider.lower() == "openai":
        return litellm.completion(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            seed=42,
            top_p=0.95,
            api_key=open_api_key
        )
    elif provider.lower() == "anthropic":
        return litellm.completion(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            seed=42,
            top_p=0.85,
            api_key=claude_api_key
        )

def parse_file_contents(files: List[Dict[str, str]]) -> Dict[str, str]:
    """Parse file contents from the provided list of files"""
    return {
        file['filename']: file['content']
        for file in files
    }

def parse_repository_files(repo_path: str) -> Dict[str, str]:
    """Parse all relevant files from repository"""
    file_contents = {}
    for root, _, files in os.walk(repo_path):
        for file in files:
            if file.endswith(('.py', '.java', '.js', '.jsx', '.ts', '.tsx', '.cpp', '.h', '.cs')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        file_contents[file_path] = f.read()
                except Exception as e:
                    print(json.dumps({
                        'status': 'error',
                        'message': f"Error reading {file_path}: {str(e)}"
                    }))
    return file_contents

def analyze_code_patterns(file_contents: Dict[str, str]) -> Dict:
    """Analyze code for patterns and conventions"""
    analyzed_data = {
        'naming_patterns': defaultdict(list),
        'indentation_patterns': defaultdict(int),
        'comment_styles': defaultdict(int),
        'file_organization': defaultdict(int),
        'code_structure': defaultdict(list)
    }
    
    for file_path, content in file_contents.items():
        # Analyze naming patterns
        class_pattern = r'class\s+([A-Za-z_][A-Za-z0-9_]*)'
        function_pattern = r'def\s+([A-Za-z_][A-Za-z0-9_]*)'
        variable_pattern = r'([a-zA-Z_][a-zA-Z0-9_]*)\s*='
        
        classes = re.findall(class_pattern, content)
        functions = re.findall(function_pattern, content)
        variables = re.findall(variable_pattern, content)
        
        analyzed_data['naming_patterns']['classes'].extend(classes)
        analyzed_data['naming_patterns']['functions'].extend(functions)
        analyzed_data['naming_patterns']['variables'].extend(variables)
        
        # Analyze indentation
        lines = content.split('\n')
        for line in lines:
            if line.strip():
                indent = len(line) - len(line.lstrip())
                analyzed_data['indentation_patterns'][indent] += 1
        
        # Analyze comments
        docstring_pattern = r'"""[\s\S]*?"""'
        inline_comment_pattern = r'#.*$'
        
        docstrings = re.findall(docstring_pattern, content)
        inline_comments = re.findall(inline_comment_pattern, content, re.MULTILINE)
        
        analyzed_data['comment_styles']['docstrings'] += len(docstrings)
        analyzed_data['comment_styles']['inline'] += len(inline_comments)
        
        # Analyze file organization
        class_count = len(classes)
        function_count = len(functions)
        analyzed_data['file_organization']['classes_per_file'] += class_count
        analyzed_data['file_organization']['functions_per_file'] += function_count
        
    return analyzed_data

def generate_guidelines_prompt(analyzed_data: Dict, file_contents: Dict[str, str]) -> str:
    """Generate AI prompt for guidelines creation"""
    prompt = f"""
    Create a comprehensive documentation of existing coding patterns, standards, and practices based on the analyzed codebase or the files. Focus exclusively on current implementations and standards.

    Analyzed Context:
    - Files analyzed: {len(file_contents)}
    - File types present: {', '.join(set(f.split('.')[-1] for f in file_contents.keys()))}
    - Core metrics:
      * Classes: {', '.join(analyzed_data['naming_patterns']['classes'][:5])}
      * Functions: {', '.join(analyzed_data['naming_patterns']['functions'][:5])}
      * Variables: {', '.join(analyzed_data['naming_patterns']['variables'][:5])}
      * Documentation density: {analyzed_data['comment_styles']['docstrings'] + analyzed_data['comment_styles']['inline']}

    Document these aspects based STRICTLY on existing patterns also do not recommend what changes can be make only what have used in the codebase or the files:

    1. NAMING CONVENTIONS
    - File naming patterns
    - Directory naming structure
    - Class naming formats
    - Function/method naming formats
    - Variable naming patterns
    - Constant naming conventions
    - Parameter naming standards
    - Interface/abstract class naming
    - Test file naming
    - Special case naming patterns

    2. CODE STYLE & FORMATTING
    - Indentation type and depth
    - Line spacing patterns
    - Line length practices
    - Trailing whitespace handling
    - Bracket placement
    - Operator spacing
    - Comma and semicolon formatting
    - String quote usage (single/double)
    - Continuation line alignment
    - Array and object formatting

    3. LINT CONDITIONS
    - Active lint rules
    - Enforced syntax patterns
    - Code complexity thresholds
    - Unused variable handling
    - Import organization rules
    - Type checking requirements
    - Error handling patterns
    - Console logging rules
    - Function complexity limits
    - Cyclomatic complexity patterns

    4. STRUCTURAL PATTERNS
    - Directory hierarchy
    - File organization
    - Class structure patterns
    - Function organization
    - Module patterns
    - Component organization
    - Test structure
    - Resource organization
    - Configuration file placement
    - Build artifact organization

    5. DOCUMENTATION STANDARDS
    - Comment style patterns
    - Documentation format
    - API documentation
    - Class documentation
    - Method documentation
    - Parameter documentation
    - Return value documentation
    - Exception documentation
    - Type hint usage
    - Inline comment patterns

    6. STYLING SPECIFICS
    - CSS/SCSS organization
    - Component styling patterns
    - Media query handling
    - Theme implementation
    - Style inheritance patterns
    - CSS class naming
    - Style scoping approaches
    - Responsive design patterns
    - Animation conventions
    - UI component styling

    7. TECHNICAL IMPLEMENTATION
    - Design pattern usage
    - Error handling implementation
    - Logging mechanisms
    - Testing approaches
    - Database interaction patterns
    - API integration methods
    - Authentication handling
    - State management
    - Cache implementation
    - Performance optimization patterns

    Requirements:
    - Document ONLY existing patterns
    - NO suggestions or improvements
    - NO comparative analysis
    - NO best practice recommendations
    - Include ONLY implemented standards
    - Use objective, descriptive language
    - Focus on current implementation details
    - Document edge cases and exceptions
    - Include platform-specific patterns
    - Note technology-specific conventions

    Format using clear Markdown structure, emphasizing hierarchy and organization.
    """
    return prompt

def generate_guidelines_document(input_data: Dict) -> Dict:
    """Generate guidelines document from codebase analysis"""
    try:
        file_contents = parse_file_contents(input_data['files'])
        
        if not file_contents:
            raise ValueError("No valid files found to analyze")

        analyzed_data = analyze_code_patterns(file_contents)
        prompt = generate_guidelines_prompt(analyzed_data, file_contents)
        response = generate_litellm_response(prompt, input_data['modelType'], input_data['provider'])
        
        return {
            'content': response['choices'][0]['message']['content'],
            'status': 'success'
        }

    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
        result = generate_guidelines_document(input_data)
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({
            'status': 'error',
            'message': f'Invalid JSON input: {str(e)}'
        }))
    except Exception as e:
        print(json.dumps({
            'status': 'error',
            'message': str(e)
        }))                                                                                      