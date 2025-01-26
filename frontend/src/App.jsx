
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoutes";
import { AuthProvider } from "./context/AuthContext";
import Home from './components/home/Home'
import Dashboard from './components/dashboard/Dashboard'
import GenerateGuidelines from "./components/generateguidelines/GenerateGuidelines"
import ReviewFile from "./components/review/ReviewFile";
import ReviewCodebase from "./components/review/ReviewCodebase";
import Comments from "./components/review/Comments";
import Output from "./components/output/Output";
import Documentation from "./components/review/Documentation";
import OutputGuideline from "./components/output/OutputGuideline";
import OutputCodebase from "./components/output/OutputCodebase";
import OutputReview from "./components/output/OutputReview";
import OutputDocumentation from "./components/output/OutputDocumentation";
import OutputKG from "./components/output/OutputKG";
import OutputComments from "./components/output/OutputComments";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate_guidelines" element={<GenerateGuidelines />} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/api/analyzecodebase" element={<ReviewCodebase/>} />
          <Route path="/api/analyzefile" element={<ReviewFile/>} />
          <Route path="/api/generate_documentation" element={<Documentation/>} />
          <Route path="/api/generate_comments" element={<Comments/>} />
          
          <Route path="/output" element={<Output/>} />
          <Route path="/output/generated_guidelines_docs" element={<OutputGuideline/>}/>
          <Route path="/output/generated_analyzed_codebase_docs" element={<OutputCodebase/>}/>
          <Route path="/output/generated_analyzed_files_docs" element={<OutputReview/>}/>
          <Route path="/output/generated_knowledge_graph" element={<OutputKG/>}/>
          <Route path="/output/generated_documentation_docs" element={<OutputDocumentation/>}/>
          <Route path="/output/generated_comments_docs" element={<OutputComments/>}/>

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/generate_guidelines"
            element={
              <PrivateRoute>
                <GenerateGuidelines/>
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/api/analyzecodebase"
            element={
              <PrivateRoute>
                <ReviewCodebase />
              </PrivateRoute>
            }
          />
          <Route
          path="/api/analyzefile"
          element={
            <PrivateRoute>
              <ReviewFile/>
            </PrivateRoute>
          }
          />
           <Route
          path="/api/generate_documentation"
          element={
            <PrivateRoute>
              <Documentation/>
            </PrivateRoute>
          }
          />
           <Route
          path="/api/generate_comments"
          element={
            <PrivateRoute>
              <Comments/>
            </PrivateRoute>
          }
          />
          
          <Route
          path="/output"
          element={
            <PrivateRoute>
              <Output/>
            </PrivateRoute>
            }
            />
            
            <Route
          path="/output/generated_analyzed_files_docs"
          element={
            <PrivateRoute>
              <OutputGuideline/>
            </PrivateRoute>
            }
            />
            <Route
            path="/output/generated_analyzed_codebase_docs"
            element={
              <PrivateRoute>
                <OutputCodebase/>
              </PrivateRoute>
            }
            />
            <Route
            path="/output/generated_knowledge_graph"
            element={
              <PrivateRoute>
                <OutputKG/>

              </PrivateRoute>
              }
              />
             <Route
            path="/output/generated_documentation_docs"
            element={
              <PrivateRoute>
                <OutputDocumentation/>
              </PrivateRoute>
            }
            />
            <Route
            path="/output/generated_comments_docs"
            element={
              <PrivateRoute>
                <OutputComments/>
              </PrivateRoute>
            }
            />
         
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
