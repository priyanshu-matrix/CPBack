import os
import random
import string
import json
import shutil
import argparse
import subprocess
import tempfile
import sys

# Helper function to compile C++ code
def compile_cpp(source_path, executable_path, compiler="g++", compile_args_str="-std=c++17 -O2"):
    """Compiles the C++ source file to the specified executable path."""
    compile_command = [compiler] + compile_args_str.split() + [source_path, "-o", executable_path]
    try:
        process = subprocess.run(compile_command, capture_output=True, text=True, check=True, timeout=30) # Added timeout for compilation
        return True
    except subprocess.CalledProcessError as e:
        print(f"Compilation failed for {source_path}:")
        print(f"Command: {' '.join(compile_command)}")
        print(f"Return code: {e.returncode}")
        print(f"Stdout: {e.stdout.strip()}")
        print(f"Stderr: {e.stderr.strip()}")
        return False
    except subprocess.TimeoutExpired:
        print(f"Compilation timed out for {source_path} (command: {' '.join(compile_command)})")
        return False
    except FileNotFoundError:
        print(f"Error: Compiler '{compiler}' not found. Please ensure it's in your PATH.")
        return False

# Helper function to run the compiled C++ executable
def run_cpp(executable_path, input_text, timeout_duration=5):
    """Runs the C++ executable with the given input text and returns its stdout."""
    try:
        process = subprocess.run(
            [executable_path],
            input=input_text,
            capture_output=True,
            text=True,
            timeout=timeout_duration,
            check=False 
        )
        if process.returncode != 0:
            stderr_output = process.stderr.strip()
            # print with end=" " to allow main loop to print "Skipping." on the same line.
            print(f"C++ program exited with code {process.returncode}. Stderr: '{stderr_output}'", end=" ")
            return None
        return process.stdout.strip()
    except subprocess.TimeoutExpired:
        print("C++ program timed out.", end=" ")
        return None
    except Exception as e:
        print(f"Error running C++ program: {e}", end=" ")
        return None

# --- Input Generation Functions ---
# These functions now only generate input content.

def generate_number_inputs(count=25, min_val=1, max_val=10**9):
    """Generate two numbers as input, with varied strategies for dynamism,
    intended for a C++ program that sums them."""
    inputs = []
    for i in range(count):
        complexity_factor = (i + 1) / count
        current_range_min = min_val
        
        # Calculate current_range_max based on complexity_factor
        # It scales from min_val towards max_val as i increases.
        current_range_max_calculated = int(min_val + (max_val - min_val) * complexity_factor)
        
        # Ensure current_range_max is within global bounds and logical
        current_range_max = min(current_range_max_calculated, max_val) # Cap at global max_val
        current_range_max = max(current_range_min, current_range_max) # Ensure current_range_min <= current_range_max

        num1, num2 = 0, 0 # Initialize num1 and num2

        # Cycle through different generation strategies based on the iteration index 'i'
        # This ensures a variety of test case structures are generated.
        strategy_idx = i % 4 

        if strategy_idx == 0:
            # Strategy 0: Both numbers are chosen randomly within the current dynamic range.
            # This covers general cases.
            num1 = random.randint(current_range_min, current_range_max)
            num2 = random.randint(current_range_min, current_range_max)
        elif strategy_idx == 1:
            # Strategy 1: One number is an edge value (min or max of the current range), 
            # the other is chosen randomly within the current range.
            # This tests behavior with boundary values.
            if random.random() < 0.5: # Determine if num1 or num2 will be the edge value
                num1 = random.choice([current_range_min, current_range_max])
                num2 = random.randint(current_range_min, current_range_max)
            else:
                num1 = random.randint(current_range_min, current_range_max)
                num2 = random.choice([current_range_min, current_range_max])
        elif strategy_idx == 2:
            # Strategy 2: Both numbers are edge values of the current range.
            # This includes combinations like (min,min), (min,max), (max,min), (max,max).
            num1 = random.choice([current_range_min, current_range_max])
            num2 = random.choice([current_range_min, current_range_max])
        elif strategy_idx == 3:
            # Strategy 3: Both numbers are equal (num1 = num2).
            # The common value is chosen randomly from the current range.
            # This tests cases where inputs are identical.
            val = random.randint(current_range_min, current_range_max)
            num1 = val
            num2 = val
        
        inputs.append({
            "input_content": f"{num1} {num2}", # Format as two space-separated numbers
            "isSample": i < 2 # The first two inputs are marked as samples
        })
    return inputs

def generate_array_inputs(count=25, max_size=10**5, max_val=10**9):
    """Generate array-based inputs with increasing complexity"""
    inputs = []
    for i in range(count):
        complexity_factor = (i + 1) / count
        size = int(5 + (max_size - 5) * complexity_factor)
        size = min(size, 100 + i * 20) 
        size = max(0, size) # Ensure size is not negative
        current_max_val = int(100 + (max_val - 100) * complexity_factor)
        
        arr = []
        if size > 0: # Only generate array if size > 0
            if i < count * 0.3:
                arr = [random.randint(1, current_max_val) for _ in range(size)]
            elif i < count * 0.6:
                arr = [random.randint(-current_max_val, current_max_val) for _ in range(size)]
            else:
                if random.random() < 0.5:
                    arr = sorted([random.randint(1, current_max_val) for _ in range(size)])
                    outliers = int(size * 0.1)
                    for _ in range(outliers):
                        idx = random.randint(0, size-1)
                        arr[idx] = random.randint(-current_max_val, current_max_val)
                else:
                    base_val = random.randint(1, 1000)
                    arr = [base_val for _ in range(size)]
                    outliers = int(size * 0.2)
                    for _ in range(outliers):
                        idx = random.randint(0, size-1)
                        arr[idx] = random.randint(-current_max_val, current_max_val)
        
        input_str = f"{size}\n{' '.join(map(str, arr))}"
        inputs.append({
            "input_content": input_str,
            "isSample": i < 2
        })
    return inputs

def generate_string_inputs(count=25, max_length=10**5):
    """Generate string-based inputs with increasing complexity"""
    inputs = []
    for i in range(count):
        complexity_factor = (i + 1) / count
        length = int(10 + (max_length - 10) * complexity_factor)
        length = min(length, 100 + i * 50)
        length = max(0, length) # Ensure length is not negative
        
        s = ""
        if length == 0:
            s = ""
        elif i < count * 0.2:
            s = ''.join(random.choice(string.ascii_lowercase) for _ in range(length))
        elif i < count * 0.4:
            s = ''.join(random.choice(string.ascii_letters) for _ in range(length))
        elif i < count * 0.6:
            s = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(length))
        elif i < count * 0.8:
            pattern_length = random.randint(1, max(1, min(10, length))) # Ensure pattern_length is valid
            pattern = ''.join(random.choice(string.ascii_lowercase) for _ in range(pattern_length))
            s = (pattern * (length // pattern_length + 1))[:length]
        else: 
            half_len = length // 2
            half = ''.join(random.choice(string.ascii_lowercase) for _ in range(half_len))
            if length % 2 == 0:
                s = half + half[::-1]
            else:
                middle = random.choice(string.ascii_lowercase)
                s = half + middle + half[::-1]
            
            noise_count = int(length * 0.1)
            s_list = list(s)
            for _ in range(noise_count):
                if not s_list: break
                idx = random.randint(0, len(s_list) - 1)
                s_list[idx] = random.choice(string.ascii_lowercase)
            s = "".join(s_list)

        inputs.append({
            "input_content": s,
            "isSample": i < 2
        })
    return inputs

def generate_graph_inputs(count=25, max_nodes=10**5, max_edges=10**5):
    """Generate graph-based inputs with increasing complexity"""
    inputs = []
    for i in range(count):
        complexity_factor = (i + 1) / count
        nodes = int(3 + (max_nodes - 3) * complexity_factor) # Start with at least 3 nodes for interesting graphs
        nodes = min(nodes, 20 + i * 5)
        nodes = max(0, nodes) # Allow 0 nodes

        num_edges = 0
        if nodes == 0:
            num_edges = 0
        elif nodes == 1:
            num_edges = 0
        elif i < count * 0.3: # Tree
            num_edges = nodes - 1
        elif i < count * 0.6: # Sparse graph
            num_edges = min(nodes * 2, max_edges, nodes * (nodes-1) // 2)
        else: # Dense graph
            max_possible_edges = nodes * (nodes - 1) // 2
            num_edges = min(max_possible_edges, max_edges)
            # Ensure a reasonable number of edges for dense, but not necessarily fully connected
            num_edges = random.randint(min(nodes-1, max_possible_edges) if nodes > 0 else 0 , num_edges)


        graph_edges = []
        if nodes > 1:
            if i < count * 0.3: # Tree generation
                # Create a random permutation for node labels to ensure varied tree structures
                node_labels = list(range(1, nodes + 1))
                random.shuffle(node_labels)
                
                # Prufer-like sequence or simpler random edge additions for a tree
                # Simpler: connect nodes sequentially then add random edges to connect components if any
                # For a guaranteed tree on N nodes:
                temp_nodes = list(range(nodes)) # 0-indexed for easier processing
                random.shuffle(temp_nodes)
                for j_node_idx in range(1, nodes):
                    # Connect temp_nodes[j_node_idx] to a random node from temp_nodes[0...j_node_idx-1]
                    parent_candidate_idx = random.randint(0, j_node_idx - 1)
                    u, v = node_labels[temp_nodes[j_node_idx]], node_labels[temp_nodes[parent_candidate_idx]]
                    graph_edges.append(tuple(sorted((u,v)))) # Store sorted to help with uniqueness if needed later
                # Ensure exactly N-1 edges for a tree
                graph_edges = list(set(graph_edges)) # Remove duplicates if any (unlikely with this method)
                while len(graph_edges) > nodes -1 and nodes > 1: # Should not happen often
                    graph_edges.pop()
                # This tree generation might not always be connected if not careful,
                # A common way is to add node j to a random node in {0..j-1}
                # Re-doing tree generation more robustly:
                if nodes > 1:
                    graph_edges = [] # Reset
                    p = list(range(nodes))
                    for j in range(1, nodes):
                        parent_idx = random.randint(0, j-1)
                        # Use original node labels 1 to N
                        graph_edges.append(tuple(sorted((node_labels[j], node_labels[p[parent_idx]]))))
                        p[j], p[parent_idx] = p[parent_idx], p[j] # Swap to ensure parent is from connected component
                num_edges = len(graph_edges)


            else: # Sparse/dense graphs (not necessarily a tree)
                possible_edges = []
                for u_idx in range(nodes):
                    for v_idx in range(u_idx + 1, nodes):
                        possible_edges.append(tuple(sorted((u_idx + 1, v_idx + 1)))) # 1-indexed nodes
                
                random.shuffle(possible_edges)
                graph_edges = possible_edges[:num_edges]
        
        actual_num_edges = len(graph_edges)
        input_lines = [f"{nodes} {actual_num_edges}"]
        for u, v in graph_edges:
            input_lines.append(f"{u} {v}")
        
        inputs.append({
            "input_content": "\n".join(input_lines),
            "isSample": i < 2
        })
    return inputs

# --- File Operations ---

def create_test_files(test_cases, output_dir):
    """Create input and output files from test cases (1-indexed)."""
    os.makedirs(output_dir, exist_ok=True)
    
    for i, test in enumerate(test_cases, 1): # Start enumeration from 1
        input_file = os.path.join(output_dir, f"input{i}.txt")
        output_file = os.path.join(output_dir, f"output{i}.txt")
        
        try:
            with open(input_file, "w") as f:
                f.write(test["input"])
            with open(output_file, "w") as f:
                f.write(test["output"])
        except IOError as e:
            print(f"Warning: Could not write test file {i}: {e}")
            # Optionally skip or handle error
    
    print(f"Created {len(test_cases)} test case files in '{output_dir}'")

def create_zip_file(test_dir_path, zip_file_full_path):
    """Create a zip file from the test directory."""
    base_name_for_archive = os.path.splitext(zip_file_full_path)[0]
    try:
        shutil.make_archive(base_name_for_archive, 'zip', root_dir=test_dir_path)
        print(f"Created zip file at '{zip_file_full_path}'")
    except Exception as e:
        print(f"Error creating zip file: {e}")

# --- Main ---
def main():
    parser = argparse.ArgumentParser(
        description="Generate test cases for a C++ solution by compiling and running it.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter # Show default values in help
    )
    parser.add_argument("--cpp-file", type=str, required=True,
                        help="Path to the C++ source file.")
    parser.add_argument("--type", choices=["number", "array", "string", "graph"], required=True,
                        help="Type of input to generate for the C++ program.")
    parser.add_argument("--count", type=int, default=25, help="Number of test cases to generate.")
    parser.add_argument("--output", default="test_cases",
                        help="Output directory for test cases.")
    parser.add_argument("--zip", action="store_true", help="Create a zip file of the test_cases directory.")
    parser.add_argument("--compiler", type=str, default="g++", help="C++ compiler command.")
    parser.add_argument("--compile-args", type=str, default="-std=c++17 -O2 -Wall", help="Arguments for C++ compiler.")
    parser.add_argument("--timeout", type=int, default=5, help="Timeout in seconds for C++ program execution per test case.")
    
    args = parser.parse_args()

    input_generator_map = {
        "number": generate_number_inputs,
        "array": generate_array_inputs,
        "string": generate_string_inputs,
        "graph": generate_graph_inputs,
    }
    selected_generator = input_generator_map[args.type]

    all_test_cases = []

    with tempfile.TemporaryDirectory() as temp_dir:
        cpp_source_basename = os.path.splitext(os.path.basename(args.cpp_file))[0]
        executable_name = f"{cpp_source_basename}_exec"
        executable_path = os.path.join(temp_dir, executable_name)

        print(f"\nCompiling '{args.cpp_file}'...")
        if not compile_cpp(args.cpp_file, executable_path, args.compiler, args.compile_args):
            print("Exiting due to compilation failure.")
            return 1
        print(f"Compilation successful. Executable: '{executable_path}'")

        print(f"\nGenerating {args.count} '{args.type}' inputs...")
        generated_raw_inputs = selected_generator(count=args.count) # Pass count explicitly

        print(f"\nRunning C++ solution for {len(generated_raw_inputs)} inputs (timeout per run: {args.timeout}s)...")
        successful_cases = 0
        for i, raw_input_item in enumerate(generated_raw_inputs, 1):
            input_content = raw_input_item["input_content"]
            input_preview = (input_content[:70].replace('\n', '\\n') + '...') if len(input_content) > 70 else input_content.replace('\n', '\\n')
            
            print(f"  Test Case {i}/{len(generated_raw_inputs)} (Input: \"{input_preview}\") ...", end=" ", flush=True)
            
            output_content = run_cpp(executable_path, input_content, args.timeout)
            
            if output_content is not None:
                all_test_cases.append({
                    "input": input_content,
                    "output": output_content,
                    "isSample": raw_input_item["isSample"] 
                })
                print("OK.")
                successful_cases +=1
            else:
                print("Failed.") # run_cpp already printed details
        
        if not all_test_cases:
            print("\nNo test cases were successfully generated. Check your C++ program, input type, or increase timeout.")
            return 1
        
        print(f"\nSuccessfully generated {successful_cases} test cases.")

    os.makedirs(args.output, exist_ok=True)
    
    json_summary_path = os.path.join(args.output, "test_cases_summary.json")
    try:
        with open(json_summary_path, "w") as f:
            json.dump(all_test_cases, f, indent=2)
        print(f"Saved test case summary to '{json_summary_path}'")
    except IOError as e:
        print(f"Warning: Could not save JSON summary: {e}")
    
    create_test_files(all_test_cases, args.output)
    
    if args.zip:
        output_dir_abs = os.path.abspath(args.output)
        # Zip file will be named after the output directory and placed in its parent directory
        # e.g., if output is "my_tests", zip is "../my_tests.zip" (relative to my_tests)
        zip_filename_base = os.path.basename(output_dir_abs)
        if not zip_filename_base: # if args.output was something like "./"
            zip_filename_base = os.path.basename(os.getcwd()) + "_tests"

        zip_full_path = os.path.join(os.path.dirname(output_dir_abs), zip_filename_base + ".zip")
        
        create_zip_file(args.output, zip_full_path)

    print("\nDone.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
