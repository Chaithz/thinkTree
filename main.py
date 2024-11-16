from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import fitz

app=FastAPI()

def chunk_text(text: str, chunk_size: int = 1000) -> list:
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

@app.post("/parse-pdf/")
async def parse_pdf(file: UploadFile = File(...)):
    #checking if the uploaded file is a pdf
    if file.content_type != "application/pdf":
        return JSONResponse(content={"error":"Only PDF files are allowed!"},status_code=400)

    #loading and extracting text
    try:
        pdf_text = ""
        with fitz.open(stream=await file.read(), filetype="pdf") as doc:
            for page_num in range(doc.page_count):
                page = doc.load_page(page_num)      #loads each page
                pdf_text += page.get_text("text")       #extracts text

        chunks = chunk_text(pdf_text, 1000)

        return {"filename": file.filename, "total_chunks":len(chunks), "chunks":chunks}

    except Exception as e:
        return JSONResponse(content={"error":f"An error occured: {str(e)}"}, status_code=500)


