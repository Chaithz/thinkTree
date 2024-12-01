"use client";
import React, { useEffect, useState } from "react";
import KnowledgeGraph from "@/components/KnowledgeGraph";


const KnowledgeGraphPage = () => {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null); // Store the "answer" field from the response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // For error handling
  const [theme, setTheme] = useState("light");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");


  useEffect(() => {
    const updateTheme = () => {
        const prefersDark = window.matchMedia("(prefer-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
    };

    updateTheme();

    const mediaQuery = window.matchMedia("(prefer-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateTheme);

    return () => mediaQuery.removeEventListener("change", updateTheme);
    }, []);
    
    const extractJSON = (text) => {
        // Use a regex to extract the JSON string from the response
        const match = text.match(/\{[\s\S]*\}/);
        return match ? match[0] : null; // Return the matched JSON string or null if not found
      };

  // Function to fetch data from the FastAPI backend
  const fetchGraphData = async () => {
    setLoading(true);
    setError(null); // Reset the error state before making the request

    try {
        const response = await fetch("http://127.0.0.1:8000/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query_text: query,      // Passing the query text as part of the JSON body
                model_name: "llama2"    // Optionally u can pass the model name
            }),
        });
    
        const data = await response.json();
        //console.log(data);  // Handle the response here

        if (data.answer) {
            try{
                const extractedJSON = extractJSON(data.answer); // Extract JSON part
                if (extractedJSON) {
                  const parsedAnswer = JSON.parse(extractedJSON); // Parse the extracted JSON
                  setAnswer(parsedAnswer); // Store the parsed JSON object
                } else {
                    throw new Error("No valid JSON found in the answer field.");
                }
                //const parsedAnswer = JSON.parse(data.answer);
                //setAnswer(parsedAnswer)
            } catch (parseError) {
                throw new Error("Failed to parse answer into JSON: " + parseError.message);
            }
        } else {
            setError("No answer field found in response");
        }
    } catch (error) {
        console.error("Error:", error);
        setError("Error fetching graph data");
    }
    

    setLoading(false);
  };

  const handleFileSelection = (e) => {
    setSelectedFile(e.target.files[0]);
  }

  const uploadFile = async () => {
    if (!selectedFile) {
        setError("No file selected!");
    }

    setLoading(true);
    setError(null);

    try{
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("http://127.0.0.1:8000/parse-pdf/", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error("failed to upload PDF");

        const data = await response.json();
        //console.log("PDF uploaded and processed:", data);
        setUploadMessage("File uploaded and processed successfully!");

    } catch (error) {
        console.error("Error uploading PDF:", error);
        setError("Error uploading PDF");
    }
    
    setLoading(false);
  };


  return (
    <div
      style={{
        backgroundColor: theme === "dark" ? "#121212" : "#ffffff",
        color: theme === "dark" ? "#ffffff" : "#000000",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ textAlign: "center" }}>Knowledge Graph</h1>


      <div style={{ textAlign: "center", margin: "20px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query"
          style={{
            padding: "10px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          id="b1"
          onClick={fetchGraphData}
          disabled={loading || !query}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading ? "Loading..." : "Generate Graph"}
        </button>
      </div>


      <div style={{ textAlign: "center", margin: "20px" }}>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelection}
          style={{
            marginTop: "20px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          id="b2"
          onClick={uploadFile}
          disabled={loading || !selectedFile}
          style={{
            padding: "10px 20px",
            marginLeft: "10px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>

      {error && <div style={{ color: "red", textAlign: "center" }}>{error}</div>}
      {uploadMessage && <div style={{ color: "green", textAlign: "center" }}>{uploadMessage}</div>}

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        {answer ? (
          <KnowledgeGraph data={answer} theme={theme} />
        ) : (
          <div>No graph data available yet.</div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
