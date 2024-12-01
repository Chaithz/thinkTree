from fastapi import FastAPI, File, UploadFile
import uvicorn
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from chromadb.config import Settings
import fitz
import ollama
import json

from pydantic import BaseModel

class QueryRequest(BaseModel):
    query_text: str
    model_name: str = "llama2"  


app = FastAPI()

# Initialize ChromaDB client
chroma_client = chromadb.Client(Settings(persist_directory="chroma_storage"))
collection = chroma_client.get_or_create_collection(name="example_collection")

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  #frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Helper: Chunking Text
def chunk_text(text: str, chunk_size: int = 1000) -> list:
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

#--chunks=[]
@app.post("/parse-pdf/")
async def parse_pdf(file: UploadFile = File(...)):
    # Checking if the uploaded file is a PDF
    if file.content_type != "application/pdf":
        return JSONResponse(content={"error": "Only PDF files are allowed!"}, status_code=400)

    # Loading and extracting text
    try:
        pdf_text = ""
        with fitz.open(stream=await file.read(), filetype="pdf") as doc:
            for page_num in range(doc.page_count):
                page = doc.load_page(page_num)  # Loads each page
                pdf_text += page.get_text("text")  # Extracts text

        # Chunk the text and store in the vector database
        #--global chunks
        chunks = chunk_text(pdf_text, 500)
        for i, chunk in enumerate(chunks):
            collection.upsert(
                documents=[chunk],
                ids=[f"{file.filename}_chunk_{i}"],
                metadatas=[{"filename": file.filename, "chunk_index": i}]
            )

        return {"filename": file.filename, "total_chunks": len(chunks)}

    except Exception as e:
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)


graph_data = {
    "nodes": [
        {
            "id": "1",
            "text": "Introduction",
            "explanation": "This section explains the basics of the topic."
        },
        {
            "id": "2",
            "text": "Methods",
            "explanation": "Detailed explanation of the methods used."
        },
        {
            "id": "3",
            "text": "Results",
            "explanation": "Summary of the key findings."
        },
        {
            "id": "4",
            "text": "Conclusion",
            "explanation": "Insights and final thoughts based on the results."
        }
    ],
    "links": [
        {"source": "1", "target": "2"},
        {"source": "2", "target": "3"},
        {"source": "3", "target": "4"},
        {"source": "1", "target": "3"}
    ]
}

# Convert JSON object to string with escape sequences
graph_data_str = json.dumps(graph_data)

@app.post("/query/")
async def query_database(query: QueryRequest):
    try:
        query_text = query.query_text
        model_name = query.model_name

        # Query the vector database
        results = collection.query(
            query_texts=[query_text],  # ChromaDB will embed this query
            n_results=4  # Return top 4 results
        )

        prompt = f"""You are an efficient knowledge distiller that returns only a json formatted text with key-value pairs of the below mentioned context.
        The key-value pairs should only include the key words and the value should be a sentence explaining the part.
        The topic should be related to the below mentioned query text.
        The json that you print should be of the following format:
        {graph_data_str}
        Headings could be changed as related to the topics.
        If the topic is unrelated, return null.
        Return nothing but the JSON output without any other unnecessary messages.
        Context: {results}
        Question: {query_text}"""

        ollama_response = ollama.chat(
            model=model_name,
            messages=[{
                'role': 'user',
                'content': prompt,
            }]
        )

        answer = ollama_response['message']['content']

        return {"query": query_text, "result": results, "answer": answer}

    except json.JSONDecodeError as e:
        return JSONResponse(content={"error": "Invalid JSON from LLM", "details": str(e)}, status_code=500)
    except Exception as e:
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)



if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)