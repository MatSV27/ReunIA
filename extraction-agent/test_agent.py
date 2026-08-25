from dotenv import load_dotenv

load_dotenv("../.env")

from agent import extract_tasks
from google.genai import types

parts = [types.Part.from_text(text=(
    "Okay so in this meeting we agreed that Maria will send the updated budget "
    "by next Friday, August 28th. Also John needs to follow up with the vendor "
    "about the contract, no specific deadline for that one."
))]

result = extract_tasks(parts)
print(result)
