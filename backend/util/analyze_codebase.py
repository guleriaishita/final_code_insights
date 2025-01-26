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

def generate_codebase_structure(repo_path):
    """
    Main function to generate codebase structure and create knowledge graph
    
    Args:
        repo_path (str): Path to the repository
    
    Returns:
        None: Creates codebasestructure.txt and Neo4j knowledge graph
    """
    def connect_to_neo4j(uri, username, password):
        try:
            return Graph(uri, auth=(username, password))
        except Exception as e:
            print(f"Neo4j Connection Error: {e}")
            traceback.print_exc()
            return None

    def detect_file_type(file_path):
        try:
            mime = magic.Magic(mime=True)
            file_type = mime.from_file(file_path)
            return file_type
        except Exception as e:
            print(f"Error detecting file type: {e}")
            return None

    def sanitize_input_content(content):
        try:
            max_content_length = 100000
            if len(content) > max_content_length:
                print(f"Content truncated to {max_content_length} characters")
                return content[:max_content_length]
            return content
        except Exception as e:
            print(f"Content sanitization error: {e}")
            return content

    class RepositoryAnalyzer:
        def __init__(self, repo_path):
            self.repo_path = repo_path
            self.repository_structure = {}

        def analyze_repository(self):
            try:
                self.repository_structure = {
                    'root': self.repo_path,
                    'directories': [],
                    'files': []
                }
                
                for root, dirs, files in os.walk(self.repo_path):
                    try:
                        current_dir = {
                            'path': root,
                            'name': os.path.basename(root),
                            'subdirectories': dirs,
                            'files': []
                        }
                        
                        for file in files:
                            try:
                                file_path = os.path.join(root, file)
                                file_info = self._analyze_file(file_path)
                                current_dir['files'].append(file_info)
                            except Exception as file_error:
                                print(f"Error analyzing file {file}: {file_error}")
                        
                        self.repository_structure['directories'].append(current_dir)
                    except Exception as dir_error:
                        print(f"Error processing directory {root}: {dir_error}")
                
                return self.repository_structure
            except Exception as e:
                print(f"Repository analysis error: {e}")
                return {}

        def _analyze_file(self, file_path):
            try:
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
                
                except Exception as parsing_error:
                    file_info['parsing_error'] = str(parsing_error)
                
                return file_info
            except Exception as e:
                print(f"File analysis error for {file_path}: {e}")
                return {'name': os.path.basename(file_path), 'error': str(e)}

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
        # i=build_repository_knowledge_graph(graph,repository_details)
        # print(i)
    def export_knowledge_graph_json_structure(graph, output_file='knowledge_graph_structure.json'):
        """
        Export a comprehensive JSON representation of the knowledge graph 
        with all relationships, inheritance hierarchies, and detailed node information
        
        Args:
            graph (Graph): Neo4j graph connection
            output_file (str): Path to output JSON file
        
        Returns:
            dict: Comprehensive knowledge graph structure
        """
        try:
            
            knowledge_graph = {
                'nodes': {},
                'relationships': {
                    'inheritance': [],
                    'method_overrides': [],
                    'sibling_relationships': [],
                    'import_relationships': []
                },
                'hierarchies': {
                    'class_hierarchies': {},
                    'method_inheritance': {}
                }
            }

           
            node_query = """
            MATCH (n)
            RETURN 
                labels(n)[0] as type, 
                id(n) as node_id, 
                properties(n) as properties
            """
            
            nodes = graph.run(node_query).data()
            for node in nodes:
                node_type = node['type']
                node_id = node['node_id']
                properties = node['properties']
                
               
                if node_type not in knowledge_graph['nodes']:
                    knowledge_graph['nodes'][node_type] = {}
                
                knowledge_graph['nodes'][node_type][str(node_id)] = {
                    'name': properties.get('name', ''),
                    'details': properties
                }

            
            inheritance_query = """
            MATCH (derived:Class)-[r:INHERITS_FROM]->(base:Class)
            RETURN 
                id(derived) as derived_id, 
                derived.name as derived_name,
                id(base) as base_id, 
                base.name as base_name,
                r.direct as is_direct,
                r.inheritance_level as inheritance_level
            """
            
            inheritance_relationships = graph.run(inheritance_query).data()
            for rel in inheritance_relationships:
                knowledge_graph['relationships']['inheritance'].append({
                    'derived_id': str(rel['derived_id']),
                    'derived_name': rel['derived_name'],
                    'base_id': str(rel['base_id']),
                    'base_name': rel['base_name'],
                    'is_direct': rel['is_direct'],
                    'inheritance_level': rel['inheritance_level']
                })

           
            override_query = """
            MATCH (method:Method)-[o:OVERRIDES]->(parent_method:Method)
            MATCH (method)<-[:HAS_METHOD]-(derived_class:Class)
            MATCH (parent_method)<-[:HAS_METHOD]-(parent_class:Class)
            RETURN 
                method.name as method_name,
                id(method) as method_id,
                derived_class.name as derived_class,
                id(derived_class) as derived_class_id,
                parent_method.name as parent_method_name,
                id(parent_method) as parent_method_id,
                parent_class.name as parent_class,
                id(parent_class) as parent_class_id
            """
            
            override_relationships = graph.run(override_query).data()
            for rel in override_relationships:
                knowledge_graph['relationships']['method_overrides'].append({
                    'method': {
                        'id': str(rel['method_id']),
                        'name': rel['method_name'],
                        'class': {
                            'id': str(rel['derived_class_id']),
                            'name': rel['derived_class']
                        }
                    },
                    'overridden': {
                        'method_id': str(rel['parent_method_id']),
                        'method_name': rel['parent_method_name'],
                        'class': {
                            'id': str(rel['parent_class_id']),
                            'name': rel['parent_class']
                        }
                    }
                })

            
            sibling_query = """
            MATCH (c:Class)-[r:IS_SIBLING_OF]->(sibling:Class)
            RETURN 
                id(c) as class_id, 
                c.name as class_name,
                id(sibling) as sibling_id, 
                sibling.name as sibling_name,
                r.common_parent as common_parent
            """
            
            sibling_relationships = graph.run(sibling_query).data()
            for rel in sibling_relationships:
                knowledge_graph['relationships']['sibling_relationships'].append({
                    'class': {
                        'id': str(rel['class_id']),
                        'name': rel['class_name']
                    },
                    'sibling': {
                        'id': str(rel['sibling_id']),
                        'name': rel['sibling_name']
                    },
                    'common_parent': rel['common_parent']
                })

            # Imports Relationships
            import_query = """
            MATCH (module:ModuleNamespace)-[:IMPORTS]->(import:Import)
            RETURN 
                module.name as module_name,
                id(module) as module_id,
                import.name as import_name,
                id(import) as import_id,
                import.base_package as base_package,
                import.is_relative as is_relative
            """
            
            import_relationships = graph.run(import_query).data()
            for rel in import_relationships:
                knowledge_graph['relationships']['import_relationships'].append({
                    'module': {
                        'id': str(rel['module_id']),
                        'name': rel['module_name']
                    },
                    'import': {
                        'id': str(rel['import_id']),
                        'name': rel['import_name'],
                        'base_package': rel['base_package'],
                        'is_relative': rel['is_relative']
                    }
                })

            
            class_hierarchy_query = """
            MATCH path = (root:Class)-[:INHERITS_FROM*]->(ancestor:Class)
            WITH root, 
                collect(distinct ancestor.name) as ancestors,
                length(path) as depth
            RETURN 
                root.name as root_class,
                ancestors,
                depth
            ORDER BY depth DESC
            """
            
            class_hierarchies = graph.run(class_hierarchy_query).data()
            for hierarchy in class_hierarchies:
                knowledge_graph['hierarchies']['class_hierarchies'][hierarchy['root_class']] = {
                    'ancestors': hierarchy['ancestors'],
                    'depth': hierarchy['depth']
                }

            
            method_inheritance_query = """
MATCH (base:Class)-[:HAS_METHOD]->(base_method:Method)
MATCH (derived:Class)-[:INHERITS_FROM*]->(base)
MATCH (derived)-[:HAS_METHOD]->(derived_method:Method)
WHERE derived_method.name = base_method.name
WITH base_method.name as base_method, 
     base.name as base_class, 
     collect(DISTINCT derived.name) as derived_classes,
     collect(DISTINCT derived_method.name) as derived_methods
RETURN 
    base_method, 
    base_class, 
    derived_classes, 
    derived_methods
            """
            
            method_inheritance = graph.run(method_inheritance_query).data()
            for inheritance in method_inheritance:
                knowledge_graph['hierarchies']['method_inheritance'][inheritance['base_method']] = {
                    'base_class': inheritance['base_class'],
                    'inherited_by': {
                        'classes': inheritance['derived_classes'],
                        'methods': inheritance['derived_methods']
                    }
                }

            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(knowledge_graph, f, indent=2)

            print(f"Comprehensive knowledge graph JSON exported to {output_file}")
            return knowledge_graph

        except Exception as e:
            print(f"Error exporting knowledge graph JSON: {e}")
            traceback.print_exc()
            return None


    def create_knowledge_graph(repository_details):
        try:
            graph = connect_to_neo4j(
                uri=os.getenv('NEO4J_URI'),
                username=os.getenv('NEO4J_USER'),
                password=os.getenv('NEO4J_PASSWORD')
            )
            
            build_repository_knowledge_graph(graph, repository_details)
            print("Knowledge graph created successfully!")
            
            
            json_graph_structure = export_knowledge_graph_json_structure(graph)
            print("JSON representation of knowledge graph generated.")
            
            result = graph.run("""
                MATCH (n)
                RETURN 
                    count(n) as nodes,
                    count(DISTINCT labels(n)) as node_types
            """).data()[0]
            
            print(f"Graph Statistics:")
            print(f"Total nodes: {result['nodes']}")
            print(f"Node types: {result['node_types']}")
            
            return json_graph_structure
        except Exception as e:
            print(f"Error creating knowledge graph: {e}")

    
    try:
        
        analyzer = RepositoryAnalyzer(repo_path)
        repository_details = analyzer.analyze_repository()

        
        

        
        create_knowledge_graph(repository_details)

        print("Codebase analysis and knowledge graph creation completed successfully!")

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
    try:
        # Parse input JSON from stdin with error handling
        try:
            input_json = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON input: {str(e)}")

        # Extract required fields
        files_data = input_json.get('files', [])
        temp_dir = input_json.get('temp_dir', '')
        compliance_data = input_json.get('compliance')

        if not temp_dir:
            raise ValueError("Temporary directory path is required")

        # Create absolute temp directory path
        temp_dir = os.path.abspath(temp_dir)
        os.makedirs(temp_dir, exist_ok=True)

        # Process files and generate analysis
        created_files = process_files(files_data, temp_dir)
        compliance_file = create_temp_compliance_file(compliance_data, temp_dir)
        generate_codebase_structure(temp_dir)

        # Initialize analysis content
        analysis_content = {}

        # Read knowledge graph with proper error handling
        knowledge_graph_file = os.path.join(temp_dir, 'knowledge_graph_structure.json')
        try:
            if os.path.exists(knowledge_graph_file):
                with open(knowledge_graph_file, 'r', encoding='utf-8') as f:
                    analysis_content['knowledgeGraph'] = json.load(f)
            else:
                analysis_content['knowledgeGraph'] = {
                    "error": "Knowledge graph structure was not generated",
                    "timestamp": datetime.now().isoformat()
                }
        except Exception as e:
            analysis_content['knowledgeGraph'] = {
                "error": f"Error reading knowledge graph: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

        # Return success result
        result = {
            'success': True,
            'content': analysis_content,
            'timestamp': datetime.now().isoformat(),
            'files_processed': len(created_files),
            'compliance_included': compliance_file is not None
        }

        print(json.dumps(result))
        sys.stdout.flush()

    except Exception as e:
        # Detailed error response
        error_result = {
            'success': False,
            'error': {
                'message': str(e),
                'type': type(e).__name__,
                'details': traceback.format_exc(),
                'timestamp': datetime.now().isoformat()
            }
        }
        print(json.dumps(error_result))
        sys.stderr.write(f"Error in main: {str(e)}\n")
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()