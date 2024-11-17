from fastapi import FastAPI, File, UploadFile
import uvicorn
from fastapi.responses import JSONResponse
import chromadb
from chromadb.config import Settings
import fitz
import ollama

app = FastAPI()

# Initialize ChromaDB client
chroma_client = chromadb.Client(Settings(persist_directory="chroma_storage"))
collection = chroma_client.get_or_create_collection(name="example_collection")


# Helper: Chunking Text
def chunk_text(text: str, chunk_size: int = 1000) -> list:
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]


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
        chunks = chunk_text(pdf_text, 100)
        for i, chunk in enumerate(chunks):
            collection.upsert(
                documents=[chunk],
                ids=[f"{file.filename}_chunk_{i}"],
                metadatas=[{"filename": file.filename, "chunk_index": i}]
            )

        return {"filename": file.filename, "total_chunks": len(chunks)}

    except Exception as e:
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)


@app.post("/query/")
async def query_database(query_text: str, model_name: str = "llama2"):
    try:
        # Query the vector database
        results = collection.query(
            query_texts=[query_text],  # ChromaDB will embed this query
            n_results=3  # Return top 3 results
        )


        return {"query": query_text, "result" : results}

    except Exception as e:
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
