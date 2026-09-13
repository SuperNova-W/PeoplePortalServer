from fastapi import FastAPI

# Verify we can import the auto-generated SDK!
import peopleportal_sdk

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World from Horizon Server"}
