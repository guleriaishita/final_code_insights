
import sys
import json
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
from collections import defaultdict
import traceback
import magic
from dotenv import load_dotenv
from datetime import datetime
from py2neo import Graph, Node, Relationship

def generate_codebase_structure(model_name, provider, repo_path, compliance_file_path):
    """
    Main function to generate codebase structure and create knowledge graph
    
    Args:
        model_name (str): Name of the AI model to use
        provider (str): AI provider name (openai/anthropic)
        repo_path (str): Path to the repository
        compliance_file_path (str): Path to compliance file
    
    Returns:
        None: Creates codebasestructure.txt and Neo4j knowledge graph
    """
    
    load_dotenv()
    claude_api_key = os.getenv("CLAUD_API_KEY")
    open_api_key = os.getenv("OPENAI_API_KEY")

    codebase_structure_file = os.path.join(repo_path, 'codebasestructure.txt')
    knowledge_graph_file = os.path.join(repo_path, 'knowledge_graph_structure.txt')
    
    def connect_to_neo4j(uri, username, password):
        return Graph(uri, auth=(username, password))

    def generate_litellm_response(prompt, model_name, provider):
        if provider.lower() == "openai":
            return litellm.completion(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=3000,
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

    def detect_file_type(file_path):
        try:
            mime = magic.Magic(mime=True)
            file_type = mime.from_file(file_path)
            return file_type
        except Exception as e:
            print(f"Error detecting file type: {e}")
            return None

    def sanitize_input_content(content):
        max_content_length = 100000
        if len(content) > max_content_length:
            print(f"Content truncated to {max_content_length} characters")
            return content[:max_content_length]
        return content

    class RepositoryAnalyzer:
        def __init__(self, repo_path):
            self.repo_path = repo_path
            self.repository_structure = {}

        def analyze_repository(self):
            self.repository_structure = {
                'root': self.repo_path,
                'directories': [],
                'files': []
            }
            
            for root, dirs, files in os.walk(self.repo_path):
                current_dir = {
                    'path': root,
                    'name': os.path.basename(root),
                    'subdirectories': dirs,
                    'files': []
                }
                
                for file in files:
                    file_path = os.path.join(root, file)
                    file_info = self._analyze_file(file_path)
                    current_dir['files'].append(file_info)
                
                self.repository_structure['directories'].append(current_dir)
            
            return self.repository_structure

        def _analyze_file(self, file_path):
            file_name = os.path.basename(file_path)
            file_extension = os.path.splitext(file_name)[1].lower()
            
            file_info = {
                'name': file_name,
                'path': file_path,
                'extension': file_extension,
                'size': os.path.getsize(file_path)
            }
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if file_extension == '.py':
                    file_info.update(self._parse_python_file(content))
                elif file_extension == '.java':
                    file_info.update(self._parse_java_file(content))
                elif file_extension in ['.js', '.jsx', '.ts', '.tsx']:
                    file_info.update(self._parse_javascript_file(content))
                elif file_extension == '.json':
                    file_info.update(self._parse_json_file(content))
                elif file_extension == '.xml':
                    file_info.update(self._parse_xml_file(content))
                elif file_extension in ['.cpp', '.h']:
                    file_info.update(self._parse_cpp_file(content))
                elif file_extension == '.cs':
                    file_info.update(self._parse_csharp_file(content))
            
            except Exception as e:
                file_info['parsing_error'] = str(e)
            
            return file_info

        def _parse_python_file(self, content):
            try:
                tree = ast.parse(content)
                
                class_info_dict = {}  
                standalone_functions = {}
                global_vars = []
                imports = []
                
                
                module_doc = ast.get_docstring(tree)
                module_info = {
                    'type': 'module',
                    'docstring': module_doc
                }
                
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        bases = []
                        for base in node.bases:
                            if isinstance(base, ast.Name):
                                bases.append(base.id)
                            elif isinstance(base, ast.Attribute):
                                bases.append(f"{base.value.id}.{base.attr}")
                        
                        class_info_dict[node.name] = {
                            'name': node.name,
                            'bases': bases,
                            'methods': [],
                            'attributes': [],
                            'class_methods': [],
                            'static_methods': [],
                            'properties': [],
                            'docstring': ast.get_docstring(node),
                            'decorators': [decorator.id for decorator in node.decorator_list 
                                        if isinstance(decorator, ast.Name)],
                        }
                
                
                for node in ast.walk(tree):
                   
                    if isinstance(node, ast.Import):
                        imports.extend(alias.name for alias in node.names)
                    elif isinstance(node, ast.ImportFrom):
                        module = node.module or ''
                        imports.extend(f"{module}.{alias.name}" for alias in node.names)
                    
              
                    elif isinstance(node, ast.ClassDef):
                        class_info = class_info_dict[node.name]
                        
                        
                        siblings = []
                        for other_class, other_info in class_info_dict.items():
                            if other_class != node.name:
                                common_bases = set(class_info['bases']) & set(other_info['bases'])
                                if common_bases:
                                    siblings.append({
                                        'name': other_class,
                                        'common_bases': list(common_bases)
                                    })
                        
                        class_info['siblings'] = siblings
                        
                       
                        for item in node.body:
                          
                            if isinstance(item, ast.FunctionDef):
                                method_info = {
                                    'name': item.name,
                                    'parameters': [arg.arg for arg in item.args.args],
                                    'docstring': ast.get_docstring(item),
                                    'decorators': [decorator.id for decorator in item.decorator_list 
                                                if isinstance(decorator, ast.Name)],
                                    'returns': None,  # Will be updated if return annotation exists
                                    'is_property': any(d.id == 'property' for d in item.decorator_list 
                                                    if isinstance(d, ast.Name)),
                                }
                                
                                
                                if item.returns:
                                    if isinstance(item.returns, ast.Name):
                                        method_info['returns'] = item.returns.id
                                    elif isinstance(item.returns, ast.Attribute):
                                        method_info['returns'] = f"{item.returns.value.id}.{item.returns.attr}"
                                
                                
                                if any(d.id == 'classmethod' for d in item.decorator_list 
                                    if isinstance(d, ast.Name)):
                                    class_info['class_methods'].append(method_info)
                                elif any(d.id == 'staticmethod' for d in item.decorator_list 
                                    if isinstance(d, ast.Name)):
                                    class_info['static_methods'].append(method_info)
                                elif any(d.id == 'property' for d in item.decorator_list 
                                    if isinstance(d, ast.Name)):
                                    class_info['properties'].append(method_info)
                                else:
                                    class_info['methods'].append(method_info)
                            
                            # Attribute parsing with type hints
                            elif isinstance(item, ast.AnnAssign):
                                if isinstance(item.target, ast.Name):
                                    type_hint = None
                                    if isinstance(item.annotation, ast.Name):
                                        type_hint = item.annotation.id
                                    elif isinstance(item.annotation, ast.Attribute):
                                        type_hint = f"{item.annotation.value.id}.{item.annotation.attr}"
                                    
                                    class_info['attributes'].append({
                                        'name': item.target.id,
                                        'type_hint': type_hint
                                    })
                            
                            elif isinstance(item, ast.Assign):
                                for target in item.targets:
                                    if isinstance(target, ast.Name):
                                        class_info['attributes'].append({
                                            'name': target.id,
                                            'type_hint': None
                                        })
                    
                    
                    elif isinstance(node, ast.FunctionDef):
                        if not any(node.name in info['methods'] for info in class_info_dict.values()):
                            standalone_functions[node.name] = {
                                'parameters': [arg.arg for arg in node.args.args],
                                'docstring': ast.get_docstring(node),
                                'decorators': [decorator.id for decorator in node.decorator_list 
                                            if isinstance(decorator, ast.Name)],
                                'returns': None
                            }
                            if node.returns:
                                if isinstance(node.returns, ast.Name):
                                    standalone_functions[node.name]['returns'] = node.returns.id
                                elif isinstance(node.returns, ast.Attribute):
                                    standalone_functions[node.name]['returns'] = f"{node.returns.value.id}.{node.returns.attr}"
                    
                    
                    elif isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
                        if not any(node.targets[0].id in info['attributes'] 
                                for info in class_info_dict.values()):
                            var_name = node.targets[0].id
                            global_vars.append({
                                'name': var_name,
                                'is_constant': var_name.isupper(),
                                'type_hint': None
                            })
                
                return {
                    'module': module_info,
                    'classes': list(class_info_dict.values()),
                    'functions': standalone_functions,
                    'global_variables': global_vars,
                    'imports': imports
                }
            except Exception as e:
                return {'python_parsing_error': str(e)}
                

    def ai_extract_compliance_sections(file_content,model_name, provider):
        prompt = f"""
        Task: Extract and Structure Guidelines from the Compliance Document
        
        Input Document:
        {sanitize_input_content(file_content)}
        
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
            response = generate_litellm_response(prompt,model_name,provider)
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
            pass

    def load_compliance_file(compliance_file_path):
        default_sections = {
        "review": "Default review guidelines.",
        "documentation": "Default documentation guidelines.",
        "comments": "Default comments guidelines.",
        "knowledge_graph" : "Default Knowledge graph"
        }
        if compliance_file_path is None or not os.path.exists(compliance_file_path):
            print("No compliance file provided or file not found. Using default guidelines.")
            return default_sections
        try:
            file_type = detect_file_type(compliance_file_path)
            
            with open(compliance_file_path, "r", encoding='utf-8') as file:
                content = file.read()
            if not content.strip():
                print("Compliance file is empty. Using default guidelines.")
                return default_sections
            max_file_size = 50000
            if len(content) > max_file_size:
                print(f"File size exceeds {max_file_size} characters. Truncating...")
                content = content[:max_file_size]
            extracted_sections = ai_extract_compliance_sections(
                content, model_name, provider
            )
            for section in ['review', 'documentation', 'comments','knowledge_graph']:
                if not extracted_sections[section]:
                    extracted_sections[section] = default_sections[section]
            return extracted_sections
        except Exception as e:
            print(f"Unexpected error processing compliance file: {e}")
            return default_sections
            pass

    def build_repository_knowledge_graph(graph, repository_details):
        """
        Build an enhanced knowledge graph with improved class relationships and method details
        """
        graph.delete_all()
        
        
        repo_node = Node("Repository", 
                        name=repository_details['root'],
                        total_files=sum(len(d['files']) for d in repository_details['directories']),
                        created_at=str(datetime.now()))
        graph.create(repo_node)
        
        node_registry = {repository_details['root']: repo_node}
        class_nodes = {}  
        module_nodes = {} 
        
        def create_module_hierarchy(file_path):
            """Create module hierarchy nodes and relationships"""
            parts = os.path.relpath(file_path, repository_details['root']).split(os.sep)
            current_path = repository_details['root']
            parent_node = node_registry[current_path]
            
            for part in parts[:-1]:  
                current_path = os.path.join(current_path, part)
                if current_path not in module_nodes:
                    module_node = Node("Module", 
                                    name=part,
                                    full_path=current_path,
                                    is_package=os.path.exists(os.path.join(current_path, '__init__.py')))
                    graph.create(module_node)
                    module_nodes[current_path] = module_node
                    
                    contains_rel = Relationship(parent_node, "CONTAINS", module_node)
                    graph.create(contains_rel)
                
                parent_node = module_nodes[current_path]
            
            return parent_node
            
        def create_class_structure(file_node, class_info, module_node):
            """Create enhanced class structure with detailed relationships"""
           
            class_node = Node("Class", 
                            name=class_info['name'],
                            docstring=class_info.get('docstring', ''),
                            total_methods=len(class_info.get('methods', [])) + 
                                        len(class_info.get('class_methods', [])) +
                                        len(class_info.get('static_methods', [])),
                            total_attributes=len(class_info.get('attributes', [])),
                            is_abstract=any('abstractmethod' in m.get('decorators', []) 
                                        for m in class_info.get('methods', [])))
            graph.create(class_node)
            class_nodes[class_info['name']] = class_node
            
            
            defines_class_rel = Relationship(file_node, "DEFINES", class_node)
            graph.create(defines_class_rel)
            
            module_contains_rel = Relationship(module_node, "CONTAINS", class_node)
            graph.create(module_contains_rel)
            
            
            for base in class_info.get('bases', []):
                if base in class_nodes:
                    base_node = class_nodes[base]
                    
                    
                    inherits_rel = Relationship(class_node, "INHERITS_FROM", base_node,
                                            direct=True,
                                            inheritance_level=1)
                    graph.create(inherits_rel)
                    
                   
                    child_rel = Relationship(base_node, "HAS_CHILD", class_node,
                                        direct=True,
                                        inheritance_level=1)
                    graph.create(child_rel)
                    
                    
                    def create_ancestor_relationships(child_node, ancestor_node, visited=None, level=2):
                        if visited is None:
                            visited = set()
                        
                        if ancestor_node.identity in visited:
                            return
                        visited.add(ancestor_node.identity)
                        
                        
                        for rel in graph.match((ancestor_node, None), "INHERITS_FROM"):
                            next_ancestor = rel.end_node
                            
                            
                            indirect_rel = Relationship(child_node, "INHERITS_FROM", next_ancestor,
                                                    direct=False,
                                                    inheritance_level=level)
                            graph.create(indirect_rel)
                            
                            
                            if level == 2:
                                descendant_rel = Relationship(next_ancestor, "HAS_GRANDCHILD", child_node)
                            else:
                                descendant_rel = Relationship(next_ancestor, "HAS_DESCENDANT", child_node,
                                                        inheritance_level=level)
                            graph.create(descendant_rel)
                            
                            
                            create_ancestor_relationships(child_node, next_ancestor, visited, level + 1)
                    
                    create_ancestor_relationships(class_node, base_node)
            
           
            def create_sibling_relationships(class_node):
               
                query = """
                MATCH (c1:Class {name: $class_name})-[:INHERITS_FROM {direct: true}]->(parent:Class)
                <-[:INHERITS_FROM {direct: true}]-(c2:Class)
                WHERE c1 <> c2
                RETURN DISTINCT c2, parent
                """
                results = graph.run(query, class_name=class_info['name'])
                
                for record in results:
                    sibling = record['c2']
                    parent = record['parent']
                    
                    
                    sibling_rel = Relationship(
                        class_node, 
                        "IS_SIBLING_OF", 
                        sibling,
                        common_parent=parent['name']
                    )
                    graph.create(sibling_rel)
                    
                    
                    reverse_rel = Relationship(
                        sibling,
                        "IS_SIBLING_OF",
                        class_node,
                        common_parent=parent['name']
                    )
                    graph.create(reverse_rel)
            
            create_sibling_relationships(class_node)
            
            
            for method_type in ['methods', 'class_methods', 'static_methods', 'properties']:
                for method in class_info.get(method_type, []):
                    method_node = Node(
                        "Method",
                        name=method['name'],
                        parameters=','.join(method.get('parameters', [])),
                        docstring=method.get('docstring', ''),
                        returns=method.get('returns'),
                        method_type=method_type,
                        decorators=','.join(method.get('decorators', [])),
                        is_abstract='abstractmethod' in method.get('decorators', []),
                        is_property='property' in method.get('decorators', []),
                        parameter_count=len(method.get('parameters', [])),
                        has_return_type=method.get('returns') is not None
                    )
                    graph.create(method_node)
                    
                    method_rel = Relationship(class_node, "HAS_METHOD", method_node,
                                        method_type=method_type)
                    graph.create(method_rel)
                    
                    
                    def create_method_overrides(class_node, method_node, method_name):
                        query = """
                        MATCH (c:Class)-[:INHERITS_FROM*]->(parent:Class)-[:HAS_METHOD]->(parent_method:Method)
                        WHERE c.name = $class_name AND parent_method.name = $method_name
                        RETURN parent, parent_method
                        """
                        results = graph.run(query, class_name=class_node['name'], method_name=method_name)
                        
                        for record in results:
                            override_rel = Relationship(
                                method_node, 
                                "OVERRIDES", 
                                record['parent_method'],
                                parent_class=record['parent']['name']
                            )
                            graph.create(override_rel)
                    
                    create_method_overrides(class_node, method_node, method['name'])
            
            
            for attr in class_info.get('attributes', []):
                attr_node = Node(
                    "ClassAttribute",
                    name=attr['name'],
                    type_hint=attr.get('type_hint'),
                    has_type_annotation=attr.get('type_hint') is not None
                )
                graph.create(attr_node)
                
                attr_rel = Relationship(class_node, "HAS_ATTRIBUTE", attr_node)
                graph.create(attr_rel)
        
        def process_python_file(file_info, parent_module_node):
            """Process Python file with enhanced module relationships"""
            if file_info['extension'] != '.py':
                return
                
            file_node = Node(
                "PythonFile",
                name=file_info['name'],
                path=file_info['path'],
                size=file_info['size'],
                has_classes=bool(file_info.get('classes')),
                has_functions=bool(file_info.get('functions')),
                import_count=len(file_info.get('imports', []))
            )
            graph.create(file_node)
            
            contains_file_rel = Relationship(parent_module_node, "CONTAINS", file_node)
            graph.create(contains_file_rel)
            
            
            module_node = Node(
                "ModuleNamespace",
                name=os.path.splitext(file_info['name'])[0],
                docstring=file_info.get('module', {}).get('docstring', ''),
                file_path=file_info['path']
            )
            graph.create(module_node)
            
            defines_module_rel = Relationship(file_node, "DEFINES", module_node)
            graph.create(defines_module_rel)
            
           
            if 'classes' in file_info:
                for class_info in file_info['classes']:
                    create_class_structure(file_node, class_info, module_node)
            
            
            if 'functions' in file_info:
                for func_name, func_info in file_info['functions'].items():
                    func_node = Node(
                        "Function",
                        name=func_name,
                        parameters=','.join(func_info.get('parameters', [])),
                        docstring=func_info.get('docstring', ''),
                        returns=func_info.get('returns'),
                        decorators=','.join(func_info.get('decorators', [])),
                        parameter_count=len(func_info.get('parameters', [])),
                        has_return_type=func_info.get('returns') is not None
                    )
                    graph.create(func_node)
                    
                    defines_func_rel = Relationship(module_node, "DEFINES", func_node)
                    graph.create(defines_func_rel)
            
            
            if 'imports' in file_info:
                for import_name in file_info['imports']:
                    import_parts = import_name.split('.')
                    import_node = Node(
                        "Import",
                        name=import_name,
                        base_package=import_parts[0],
                        is_relative=import_name.startswith('.')
                    )
                    graph.create(import_node)
                    
                    imports_rel = Relationship(module_node, "IMPORTS", import_node)
                    graph.create(imports_rel)
        
        
        for directory in repository_details['directories']:
            parent_module_node = create_module_hierarchy(directory['path'])
            for file_info in directory['files']:
                process_python_file(file_info, parent_module_node)
    def export_knowledge_graph_structure(graph, output_file):
        """
        Export all nodes and relationships from the knowledge graph with enhanced class relationship details
        """
        try:
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            with open(output_file, 'w', encoding='utf-8') as file:
                file.write("=== KNOWLEDGE GRAPH STRUCTURE ===\n\n")
                
                
                node_query = """
                MATCH (n)
                WITH labels(n)[0] as type, collect(n) as nodes
                RETURN type, nodes
                ORDER BY type
                """
                
                file.write("### NODES ###\n\n")
                node_results = graph.run(node_query).data()
                
                for result in node_results:
                    node_type = result['type']
                    nodes = result['nodes']
                    
                    file.write(f"[{node_type} Nodes]\n")
                    for node in nodes:
                        file.write(f"\nNode ID: {node.identity}\n")
                        for key, value in node.items():
                            if value:
                                file.write(f"  {key}: {value}\n")
                    file.write("\n" + "="*50 + "\n\n")
                
                
                file.write("\n### CLASS INHERITANCE HIERARCHIES ###\n\n")
                
                
                root_class_query = """
                MATCH (c:Class)
                WHERE NOT (c)-[:INHERITS_FROM]->()
                RETURN c.name as class_name
                ORDER BY c.name
                """
                
                root_classes = graph.run(root_class_query).data()
                
                for root in root_classes:
                    file.write(f"\nClass Hierarchy starting from: {root['class_name']}\n")
                    
                     
                    hierarchy_query = """
                    MATCH path = (derived:Class)-[:INHERITS_FROM*]->(base:Class {name: $root_class})
                    RETURN derived.name as derived, 
                        base.name as base,
                        length(path) as depth
                    ORDER BY depth
                    """
                    
                    hierarchy = graph.run(hierarchy_query, root_class=root['class_name']).data()
                    
                    
                    processed = set()
                    def print_hierarchy(class_name, level=0):
                        if class_name in processed:
                            return
                        processed.add(class_name)
                        file.write("  " * level + f"└── {class_name}\n")
                        
                        
                        children_query = """
                        MATCH (parent:Class {name: $class_name})<-[:INHERITS_FROM {direct: true}]-(child:Class)
                        RETURN child.name as child_name
                        ORDER BY child.name
                        """
                        children = graph.run(children_query, class_name=class_name).data()
                        for child in children:
                            print_hierarchy(child['child_name'], level + 1)
                    
                    print_hierarchy(root['class_name'])
                
                
                file.write("\n### DETAILED CLASS RELATIONSHIPS ###\n\n")
                
                class_query = """
                MATCH (c:Class)
                RETURN c.name as class_name
                ORDER BY c.name
                """
                
                classes = graph.run(class_query).data()
                
                for cls in classes:
                    class_name = cls['class_name']
                    file.write(f"\nClass: {class_name}\n")
                    
                    
                    parent_query = """
                    MATCH (c:Class {name: $class_name})-[:INHERITS_FROM]->(parent:Class)
                    RETURN parent.name as parent_name
                    """
                    parents = graph.run(parent_query, class_name=class_name).data()
                    if parents:
                        file.write("Parents:\n")
                        for parent in parents:
                            file.write(f"  - {parent['parent_name']}\n")
                    
                    
                    children_query = """
                    MATCH (c:Class {name: $class_name})<-[:INHERITS_FROM {direct: true}]-(child:Class)
                    RETURN child.name as child_name
                    """
                    children = graph.run(children_query, class_name=class_name).data()
                    if children:
                        file.write("Direct Children:\n")
                        for child in children:
                            file.write(f"  - {child['child_name']}\n")
                    
                    
                    grandchildren_query = """
                    MATCH (c:Class {name: $class_name})<-[:INHERITS_FROM*2]-(grandchild:Class)
                    RETURN DISTINCT grandchild.name as grandchild_name
                    """
                    grandchildren = graph.run(grandchildren_query, class_name=class_name).data()
                    if grandchildren:
                        file.write("Grandchildren:\n")
                        for grandchild in grandchildren:
                            file.write(f"  - {grandchild['grandchild_name']}\n")
                    
                    
                    sibling_query = """
                    MATCH (c:Class {name: $class_name})-[r:IS_SIBLING_OF]->(sibling:Class)
                    RETURN sibling.name as sibling_name, r.common_parent as common_parent
                    """
                    siblings = graph.run(sibling_query, class_name=class_name).data()
                    if siblings:
                        file.write("Siblings:\n")
                        for sibling in siblings:
                            file.write(f"  - {sibling['sibling_name']} (Common Parent: {sibling['common_parent']})\n")
                
                
                file.write("\n### METHOD INHERITANCE ###\n\n")
                
                method_query = """
                MATCH (c:Class)-[:HAS_METHOD]->(m:Method)
                OPTIONAL MATCH (m)-[o:OVERRIDES]->(parent_m:Method)<-[:HAS_METHOD]-(parent:Class)
                RETURN 
                    c.name as class_name,
                    m.name as method_name,
                    m.parameters as parameters,
                    m.returns as returns,
                    parent.name as overridden_in,
                    parent_m.name as parent_method
                ORDER BY class_name, method_name
                """
                
                methods = graph.run(method_query).data()
                current_class = None
                
                for method in methods:
                    if method['class_name'] != current_class:
                        current_class = method['class_name']
                        file.write(f"\n[Class: {current_class}]\n")
                    
                    file.write(f"\nMethod: {method['method_name']}")
                    if method['parameters']:
                        file.write(f"\n  Parameters: {method['parameters']}")
                    if method['returns']:
                        file.write(f"\n  Returns: {method['returns']}")
                    if method['overridden_in']:
                        file.write(f"\n  Overrides: {method['overridden_in']}.{method['parent_method']}")
                    file.write("\n")
                
                print(f"Knowledge graph structure has been exported to {output_file}")
                return True
            if os.path.exists(output_file):
                return True
            else:
                print(f"File was not created at: {output_file}")
                return False
                    
        except Exception as e:
            print(f"Error exporting knowledge graph: {e}")
            traceback.print_exc()
            return False


    def create_knowledge_graph(repository_details):
            try:
                graph = connect_to_neo4j(
                    uri=os.getenv('NEO4J_URI'),
                    username=os.getenv('NEO4J_USER'),
                    password=os.getenv('NEO4J_PASSWORD')
                )
                
                # Test Neo4j connection
                try:
                    test_query = graph.run("MATCH (n) RETURN count(n) as count LIMIT 1").data()
                    print("Successfully connected to Neo4j")
                except Exception as e:
                    print(f"Neo4j connection error: {e}")
                    return
                
                build_repository_knowledge_graph(graph, repository_details)
                print("Knowledge graph created successfully!")
                
                # Export knowledge graph structure with absolute path
                if export_knowledge_graph_structure(graph, knowledge_graph_file):
                    print(f"Knowledge graph structure exported to: {knowledge_graph_file}")
                else:
                    print("Failed to export knowledge graph structure")
                
                result = graph.run("""
                    MATCH (n)
                    RETURN 
                        count(n) as nodes,
                        count(DISTINCT labels(n)) as node_types
                """).data()[0]
                
                print(f"Graph Statistics:")
                print(f"Total nodes: {result['nodes']}")
                print(f"Node types: {result['node_types']}")
                
            except Exception as e:
                print(f"Error creating knowledge graph: {e}")
                traceback.print_exc()

    try:
        
        analyzer = RepositoryAnalyzer(repo_path)
        repository_details = analyzer.analyze_repository()

        
        compliance_sections = load_compliance_file(compliance_file_path)

        
        structure_analysis = generate_litellm_response(
            f"""
            Analyze the following repository structure and create a detailed report:
            {repository_details}
            
            Compliance guidelines:
            {compliance_sections}
            """,
            model_name,
            provider
        )

        
        codebase_structure_file = os.path.join(repo_path, 'codebasestructure.txt')
        try:
            with open(codebase_structure_file, 'w', encoding='utf-8') as f:
                content = structure_analysis['choices'][0]['message']['content']
                f.write(content)
            print(f"Successfully wrote codebase structure to: {codebase_structure_file}")
        except Exception as e:
            print(f"Error writing codebase structure: {e}")
            traceback.print_exc()
        
        create_knowledge_graph(repository_details)
        
        # Verify files were created
        files_status = {
            'codebase': os.path.exists(codebase_structure_file),
            'knowledge_graph': os.path.exists(os.path.join(repo_path, 'knowledge_graph_structure.txt'))
        }
        print(f"Files creation status: {files_status}")
        
    except Exception as e:
        print(f"Error in generate_codebase_structure: {e}")
        traceback.print_exc()


def process_files(files_data, temp_dir):
    """
    Process the uploaded files and create a temporary directory structure
    
    Args:
        files_data (list): List of dictionaries containing file information
        temp_dir (str): Path to temporary directory
        
    Returns:
        list: List of created file paths
    """
    if not files_data:
        return []
    
    file_paths = []
    for file_info in files_data:
        # Create file path maintaining any directory structure
        file_path = os.path.join(temp_dir, file_info['filename'])
        
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Write file content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_info['content'])
        
        file_paths.append(file_path)
    
    return file_paths

def create_temp_compliance_file(compliance_data, temp_dir):
    """
    Create temporary compliance file if provided
    
    Args:
        compliance_data (dict): Dictionary containing compliance file information
        temp_dir (str): Path to temporary directory
        
    Returns:
        str or None: Path to created compliance file, or None if no data provided
    """
    if not compliance_data:
        return None
    
    compliance_path = os.path.join(temp_dir, compliance_data['filename'])
    os.makedirs(os.path.dirname(compliance_path), exist_ok=True)
    
    with open(compliance_path, 'w', encoding='utf-8') as f:
        f.write(compliance_data['content'])
    
    return compliance_path
def main():
    """
    Main function to process JSON input from stdin and handle file operations
    """
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        
        # Extract required data
        files_data = input_data.get('files', [])
        temp_dir = input_data.get('temp_dir', '')
        compliance_data = input_data.get('compliance', None)
        provider = input_data.get('provider', '')
        model_type = input_data.get('modelType', '')
        
        # Convert temp_dir to absolute path and ensure it exists
        temp_dir = os.path.abspath(temp_dir)
        os.makedirs(temp_dir, exist_ok=True)
        
        print(f"Using temporary directory: {temp_dir}")
        
        # Process files
        created_files = process_files(files_data, temp_dir)
        
        # Process compliance file if provided
        compliance_file = create_temp_compliance_file(compliance_data, temp_dir)
        
        # Generate codebase structure
        generate_codebase_structure(model_type, provider, temp_dir, compliance_file)
        
        # Read the generated files with proper error handling
        analysis_content = {}
        
        # Read codebase structure
        codebase_file = os.path.join(temp_dir, 'codebasestructure.txt')
        try:
            if os.path.exists(codebase_file):
                with open(codebase_file, 'r', encoding='utf-8') as f:
                    analysis_content['codebaseStructure'] = f.read()
            else:
                print(f"Warning: Codebase structure file not found at {codebase_file}")
                analysis_content['codebaseStructure'] = "Codebase structure analysis could not be generated"
        except Exception as e:
            print(f"Error reading codebase structure file: {e}")
            analysis_content['codebaseStructure'] = f"Error reading codebase structure: {str(e)}"
            
        # Read knowledge graph structure
        knowledge_graph_file = os.path.join(temp_dir, 'knowledge_graph_structure.txt')
        try:
            if os.path.exists(knowledge_graph_file):
                with open(knowledge_graph_file, 'r', encoding='utf-8') as f:
                    analysis_content['knowledgeGraph'] = f.read()
            else:
                print(f"Warning: Knowledge graph file not found at {knowledge_graph_file}")
                analysis_content['knowledgeGraph'] = "Knowledge graph structure could not be generated"
        except Exception as e:
            print(f"Error reading knowledge graph file: {e}")
            analysis_content['knowledgeGraph'] = f"Error reading knowledge graph: {str(e)}"
            
        # Prepare MongoDB-friendly result object
        result = {
            'success': True,
            'content': {
                'codebaseStructure': analysis_content['codebaseStructure'],
                'knowledgeGraph': analysis_content['knowledgeGraph']
            },
            'metadata': {
                'provider': provider,
                'model_type': model_type,
                'analysis_timestamp': datetime.now().isoformat(),
                'temp_dir': temp_dir,
                'files_processed': len(created_files),
                'has_compliance_file': compliance_file is not None
            },
            'files': {
                'created': created_files,
                'compliance': compliance_file,
                'codebaseStructure': codebase_file if os.path.exists(codebase_file) else None,
                'knowledgeGraph': knowledge_graph_file if os.path.exists(knowledge_graph_file) else None
            }
        }
        
        # Write result to stdout
        print(json.dumps(result))
        sys.stdout.flush()
        
    except json.JSONDecodeError as e:
        error_result = {
            'success': False,
            'error': f"Invalid JSON input: {str(e)}",
            'content': {
                'codebaseStructure': "Error: Invalid JSON input",
                'knowledgeGraph': "Error: Invalid JSON input"
            }
        }
        print(json.dumps(error_result))
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'content': {
                'codebaseStructure': f"Error: {str(e)}",
                'knowledgeGraph': f"Error: {str(e)}"
            }
        }
        print(json.dumps(error_result))


if __name__=="__main__":
    main()
